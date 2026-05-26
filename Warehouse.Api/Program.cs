using Npgsql;
using Warehouse.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.Configure<AuthOptions>(builder.Configuration.GetSection("Auth"));
builder.Services.AddSingleton<IAuthService, AuthService>();
builder.Services
    .AddAuthentication("WarehouseToken")
    .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, TokenAuthenticationHandler>(
        "WarehouseToken",
        _ => { });
builder.Services.AddAuthorization();

var warehouseConnectionString = builder.Configuration.GetConnectionString("WarehouseDb");
if (string.IsNullOrWhiteSpace(warehouseConnectionString))
{
    builder.Services.AddSingleton<IWarehouseRepository, WarehouseRepository>();
}
else
{
    builder.Services.AddSingleton(NpgsqlDataSource.Create(warehouseConnectionString));
    builder.Services.AddSingleton<IWarehouseRepository, PostgresWarehouseRepository>();
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactClient", policy =>
        policy.WithOrigins(
                "http://localhost:5173",
                "https://localhost:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors("ReactClient");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
