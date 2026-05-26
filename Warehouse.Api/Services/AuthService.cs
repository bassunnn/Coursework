using System.Collections.Concurrent;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using Warehouse.Api.Models;

namespace Warehouse.Api.Services;

public sealed class AuthOptions
{
    public string SeedUserEmail { get; set; } = "employee@warehouse.local";
    public string SeedUserName { get; set; } = "Сотрудник склада";
    public string SeedUserPassword { get; set; } = "Warehouse123!";
    public string SeedAdminEmail { get; set; } = "admin@warehouse.local";
    public string SeedAdminName { get; set; } = "Администратор";
    public string SeedAdminPassword { get; set; } = "Admin123!";
    public string[] InvitationCodes { get; set; } = ["INVITE-2026", "WAREHOUSE-ACCESS"];
}

public interface IAuthService
{
    AuthResponse Login(LoginRequest request);
    AuthResponse Register(RegisterRequest request);
    IReadOnlyCollection<AuthUser> GetUsers();
    IReadOnlyCollection<string> GetInvitationCodes();
    AuthUser CreateUser(AdminCreateUserRequest request);
    bool DeleteEmployee(string email);
    AuthUser? ValidateToken(string token);
}

public sealed class AuthService : IAuthService
{
    private readonly ConcurrentDictionary<string, UserAccount> _users = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<string, string> _tokens = new();
    private readonly HashSet<string> _invitationCodes;

    public AuthService(IOptions<AuthOptions> options)
    {
        var authOptions = options.Value;
        _invitationCodes = authOptions.InvitationCodes
            .Where(code => !string.IsNullOrWhiteSpace(code))
            .Select(code => code.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        AddUser(authOptions.SeedUserEmail, authOptions.SeedUserName, authOptions.SeedUserPassword, Roles.Employee);
        AddUser(authOptions.SeedAdminEmail, authOptions.SeedAdminName, authOptions.SeedAdminPassword, Roles.Admin);
    }

    public AuthResponse Login(LoginRequest request)
    {
        if (!_users.TryGetValue(NormalizeEmail(request.Email), out var user)
            || !VerifyPassword(request.Password, user.PasswordHash, user.PasswordSalt))
        {
            throw new InvalidOperationException("Неверная почта или пароль.");
        }

        return IssueToken(user);
    }

    public AuthResponse Register(RegisterRequest request)
    {
        if (!_invitationCodes.Contains(request.InvitationCode.Trim()))
        {
            throw new InvalidOperationException("Код приглашения недействителен.");
        }

        var user = CreateUserAccount(request.Email, request.Name.Trim(), request.Password, Roles.Employee);

        if (!_users.TryAdd(user.Email, user))
        {
            throw new InvalidOperationException("Пользователь с такой почтой уже зарегистрирован.");
        }

        return IssueToken(user);
    }

    public IReadOnlyCollection<AuthUser> GetUsers() =>
        _users.Values
            .OrderByDescending(user => user.Role == Roles.Admin)
            .ThenBy(user => user.Name)
            .Select(ToAuthUser)
            .ToArray();

    public IReadOnlyCollection<string> GetInvitationCodes() =>
        _invitationCodes
            .OrderBy(code => code)
            .ToArray();

    public AuthUser CreateUser(AdminCreateUserRequest request)
    {
        var user = CreateUserAccount(request.Email, request.Name.Trim(), request.Password, request.Role);

        if (!_users.TryAdd(user.Email, user))
        {
            throw new InvalidOperationException("Пользователь с такой почтой уже зарегистрирован.");
        }

        return ToAuthUser(user);
    }

    public bool DeleteEmployee(string email)
    {
        var normalizedEmail = NormalizeEmail(email);

        if (!_users.TryGetValue(normalizedEmail, out var user))
        {
            return false;
        }

        if (user.Role != Roles.Employee)
        {
            throw new InvalidOperationException("Можно удалять только аккаунты сотрудников.");
        }

        if (!_users.TryRemove(normalizedEmail, out _))
        {
            return false;
        }

        foreach (var token in _tokens.Where(item => item.Value.Equals(normalizedEmail, StringComparison.OrdinalIgnoreCase)))
        {
            _tokens.TryRemove(token.Key, out _);
        }

        return true;
    }

    public AuthUser? ValidateToken(string token)
    {
        if (!_tokens.TryGetValue(token, out var email) || !_users.TryGetValue(email, out var user))
        {
            return null;
        }

        return ToAuthUser(user);
    }

    private void AddUser(string email, string name, string password, string role)
    {
        var user = CreateUserAccount(email, name, password, role);
        _users.TryAdd(user.Email, user);
    }

    private static UserAccount CreateUserAccount(string email, string name, string password, string role)
    {
        var normalizedEmail = NormalizeEmail(email);

        if (string.IsNullOrWhiteSpace(normalizedEmail) || !normalizedEmail.Contains('@'))
        {
            throw new InvalidOperationException("Укажите корректную почту.");
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new InvalidOperationException("Укажите имя пользователя.");
        }

        if (password.Length < 6)
        {
            throw new InvalidOperationException("Пароль должен быть не короче 6 символов.");
        }

        var salt = RandomNumberGenerator.GetBytes(16);
        return new UserAccount(
            normalizedEmail,
            name,
            NormalizeRole(role),
            HashPassword(password, salt),
            salt);
    }

    private AuthResponse IssueToken(UserAccount user)
    {
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        _tokens[token] = user.Email;
        return new AuthResponse(token, ToAuthUser(user));
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static string NormalizeRole(string role)
    {
        var normalizedRole = role.Trim().ToLowerInvariant();

        if (normalizedRole is Roles.Admin or Roles.Employee)
        {
            return normalizedRole;
        }

        throw new InvalidOperationException("Неизвестная роль пользователя.");
    }

    private static AuthUser ToAuthUser(UserAccount user) =>
        new(user.Email, user.Name, user.Role);

    private static byte[] HashPassword(string password, byte[] salt) =>
        Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(password),
            salt,
            100_000,
            HashAlgorithmName.SHA256,
            32);

    private static bool VerifyPassword(string password, byte[] hash, byte[] salt)
    {
        var candidate = HashPassword(password, salt);
        return CryptographicOperations.FixedTimeEquals(candidate, hash);
    }

    private sealed record UserAccount(
        string Email,
        string Name,
        string Role,
        byte[] PasswordHash,
        byte[] PasswordSalt);

    private static class Roles
    {
        public const string Admin = "admin";
        public const string Employee = "employee";
    }
}

public sealed class TokenAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IAuthService authService)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var header = Request.Headers.Authorization.ToString();

        if (!header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var token = header["Bearer ".Length..].Trim();
        var user = authService.ValidateToken(token);

        if (user is null)
        {
            return Task.FromResult(AuthenticateResult.Fail("Invalid token."));
        }

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Email),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
        };
        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
