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
    public string[] InvitationCodes { get; set; } = ["INVITE-2026", "WAREHOUSE-ACCESS"];
}

public interface IAuthService
{
    AuthResponse Login(LoginRequest request);
    AuthResponse Register(RegisterRequest request);
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

        AddUser(authOptions.SeedUserEmail, authOptions.SeedUserName, authOptions.SeedUserPassword);
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

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new InvalidOperationException("Укажите имя пользователя.");
        }

        if (request.Password.Length < 6)
        {
            throw new InvalidOperationException("Пароль должен быть не короче 6 символов.");
        }

        var user = CreateUser(request.Email, request.Name.Trim(), request.Password);

        if (!_users.TryAdd(user.Email, user))
        {
            throw new InvalidOperationException("Пользователь с такой почтой уже зарегистрирован.");
        }

        return IssueToken(user);
    }

    public AuthUser? ValidateToken(string token)
    {
        if (!_tokens.TryGetValue(token, out var email) || !_users.TryGetValue(email, out var user))
        {
            return null;
        }

        return new AuthUser(user.Email, user.Name);
    }

    private void AddUser(string email, string name, string password)
    {
        var user = CreateUser(email, name, password);
        _users.TryAdd(user.Email, user);
    }

    private static UserAccount CreateUser(string email, string name, string password)
    {
        var normalizedEmail = NormalizeEmail(email);

        if (string.IsNullOrWhiteSpace(normalizedEmail) || !normalizedEmail.Contains('@'))
        {
            throw new InvalidOperationException("Укажите корректную почту.");
        }

        var salt = RandomNumberGenerator.GetBytes(16);
        return new UserAccount(normalizedEmail, name, HashPassword(password, salt), salt);
    }

    private AuthResponse IssueToken(UserAccount user)
    {
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        _tokens[token] = user.Email;
        return new AuthResponse(token, new AuthUser(user.Email, user.Name));
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

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
        byte[] PasswordHash,
        byte[] PasswordSalt);
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
        };
        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
