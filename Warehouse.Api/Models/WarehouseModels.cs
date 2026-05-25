namespace Warehouse.Api.Models;

public sealed record Material(
    string Code,
    string ClassCode,
    string GroupCode,
    string Name,
    string MaterialAccount);

public sealed record MeasurementUnit(
    string MaterialCode,
    string UnitCode,
    string UnitName);

public sealed record Supplier(
    string Code,
    string Name,
    string Inn,
    Address LegalAddress,
    Address BankAddress,
    string BankAccountNumber);

public sealed record Address(
    string PostalCode,
    string City,
    string Street,
    string House);

public sealed record DocumentType(
    string Code,
    string Name);

public sealed record StorageUnit(
    int OrderNumber,
    DateOnly OrderDate,
    string SupplierCode,
    string BalanceAccount,
    string DocumentTypeCode,
    string DocumentNumber,
    string MaterialCode,
    string MaterialAccount,
    string UnitCode,
    decimal Quantity,
    decimal UnitPrice);

public sealed record StorageUnitCreateRequest(
    int OrderNumber,
    DateOnly OrderDate,
    string SupplierCode,
    string BalanceAccount,
    string DocumentTypeCode,
    string DocumentNumber,
    string MaterialCode,
    string MaterialAccount,
    string UnitCode,
    decimal Quantity,
    decimal UnitPrice);

public sealed record StorageUnitView(
    int OrderNumber,
    DateOnly OrderDate,
    string SupplierName,
    string MaterialName,
    string UnitName,
    decimal Quantity,
    decimal UnitPrice,
    decimal TotalPrice,
    string DocumentNumber);

public sealed record SupplierForMaterialView(
    string MaterialCode,
    string MaterialName,
    string SupplierCode,
    string SupplierName,
    string Inn,
    Address LegalAddress,
    Address BankAddress,
    string BankAccountNumber,
    decimal TotalQuantity,
    decimal TotalAmount);

public sealed record AuthUser(
    string Email,
    string Name);

public sealed record LoginRequest(
    string Email,
    string Password);

public sealed record RegisterRequest(
    string Email,
    string Name,
    string Password,
    string InvitationCode);

public sealed record AuthResponse(
    string Token,
    AuthUser User);
