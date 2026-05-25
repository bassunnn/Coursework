using Warehouse.Api.Models;

namespace Warehouse.Api.Services;

public interface IWarehouseRepository
{
    IReadOnlyCollection<Material> GetMaterials();
    IReadOnlyCollection<Supplier> GetSuppliers();
    IReadOnlyCollection<DocumentType> GetDocumentTypes();
    IReadOnlyCollection<MeasurementUnit> GetMeasurementUnits(string? materialCode = null);
    IReadOnlyCollection<StorageUnitView> GetStorageUnits();
    StorageUnit AddStorageUnit(StorageUnitCreateRequest request);
    int CountSuppliersForMaterial(string materialCode);
    IReadOnlyCollection<SupplierForMaterialView> GetSuppliersForMaterial(string materialCode);
    int CountSuppliersByBankAddress(Address bankAddress);
}

public sealed class WarehouseRepository : IWarehouseRepository
{
    private readonly List<Material> _materials =
    [
        new("MAT-001", "10", "101", "Лист стальной 2 мм", "10.01"),
        new("MAT-002", "20", "204", "Краска акриловая белая", "10.06"),
        new("MAT-003", "30", "302", "Кабель силовой ВВГнг", "10.05")
    ];

    private readonly List<MeasurementUnit> _measurementUnits =
    [
        new("MAT-001", "KG", "килограммы"),
        new("MAT-001", "PCS", "штуки"),
        new("MAT-002", "L", "литры"),
        new("MAT-003", "M", "метры")
    ];

    private readonly List<Supplier> _suppliers =
    [
        new(
            "SUP-001",
            "ООО МеталлСнаб",
            "7708123456",
            new Address("125047", "Москва", "Лесная", "5"),
            new Address("101000", "Москва", "Мясницкая", "12"),
            "40702810900000000001"),
        new(
            "SUP-002",
            "АО ПромКомплект",
            "7816123001",
            new Address("190000", "Санкт-Петербург", "Садовая", "21"),
            new Address("101000", "Москва", "Мясницкая", "12"),
            "40702810900000000002"),
        new(
            "SUP-003",
            "ИП Волкова Н.А.",
            "502900771802",
            new Address("141008", "Мытищи", "Мира", "18"),
            new Address("141002", "Мытищи", "Новомытищинский", "31"),
            "40802810400000000003")
    ];

    private readonly List<DocumentType> _documentTypes =
    [
        new("INV", "Счет-фактура"),
        new("WAY", "Товарная накладная"),
        new("ACT", "Акт приемки")
    ];

    private readonly List<StorageUnit> _storageUnits =
    [
        new(1001, new DateOnly(2026, 4, 8), "SUP-001", "15", "WAY", "ТН-450", "MAT-001", "10.01", "KG", 1200, 88.50m),
        new(1002, new DateOnly(2026, 4, 12), "SUP-002", "15", "INV", "СФ-981", "MAT-001", "10.01", "PCS", 350, 145.00m),
        new(1003, new DateOnly(2026, 4, 19), "SUP-003", "15", "WAY", "ТН-118", "MAT-002", "10.06", "L", 90, 520.00m),
        new(1004, new DateOnly(2026, 4, 28), "SUP-002", "15", "ACT", "АП-77", "MAT-003", "10.05", "M", 800, 74.30m)
    ];

    private readonly object _sync = new();

    public IReadOnlyCollection<Material> GetMaterials() => _materials;

    public IReadOnlyCollection<Supplier> GetSuppliers() => _suppliers;

    public IReadOnlyCollection<DocumentType> GetDocumentTypes() => _documentTypes;

    public IReadOnlyCollection<MeasurementUnit> GetMeasurementUnits(string? materialCode = null)
    {
        return string.IsNullOrWhiteSpace(materialCode)
            ? _measurementUnits
            : _measurementUnits
                .Where(unit => unit.MaterialCode.Equals(materialCode, StringComparison.OrdinalIgnoreCase))
                .ToArray();
    }

    public IReadOnlyCollection<StorageUnitView> GetStorageUnits()
    {
        lock (_sync)
        {
            return _storageUnits
                .OrderByDescending(unit => unit.OrderDate)
                .ThenByDescending(unit => unit.OrderNumber)
                .Select(ToView)
                .ToArray();
        }
    }

    public StorageUnit AddStorageUnit(StorageUnitCreateRequest request)
    {
        ValidateRequest(request);

        var storageUnit = new StorageUnit(
            request.OrderNumber,
            request.OrderDate,
            request.SupplierCode,
            request.BalanceAccount,
            request.DocumentTypeCode,
            request.DocumentNumber,
            request.MaterialCode,
            request.MaterialAccount,
            request.UnitCode,
            request.Quantity,
            request.UnitPrice);

        lock (_sync)
        {
            if (_storageUnits.Any(unit => unit.OrderNumber == request.OrderNumber))
            {
                throw new InvalidOperationException("Единица хранения с таким номером ордера уже существует.");
            }

            _storageUnits.Add(storageUnit);
        }

        return storageUnit;
    }

    public int CountSuppliersForMaterial(string materialCode)
    {
        return _storageUnits
            .Where(unit => unit.MaterialCode.Equals(materialCode, StringComparison.OrdinalIgnoreCase))
            .Select(unit => unit.SupplierCode)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Count();
    }

    public IReadOnlyCollection<SupplierForMaterialView> GetSuppliersForMaterial(string materialCode)
    {
        var material = FindMaterial(materialCode);

        return _storageUnits
            .Where(unit => unit.MaterialCode.Equals(materialCode, StringComparison.OrdinalIgnoreCase))
            .GroupBy(unit => unit.SupplierCode, StringComparer.OrdinalIgnoreCase)
            .Select(group =>
            {
                var supplier = FindSupplier(group.Key);
                return new SupplierForMaterialView(
                    material.Code,
                    material.Name,
                    supplier.Code,
                    supplier.Name,
                    supplier.Inn,
                    supplier.LegalAddress,
                    supplier.BankAddress,
                    supplier.BankAccountNumber,
                    group.Sum(unit => unit.Quantity),
                    group.Sum(unit => unit.Quantity * unit.UnitPrice));
            })
            .OrderBy(item => item.SupplierName)
            .ToArray();
    }

    public int CountSuppliersByBankAddress(Address bankAddress)
    {
        return _suppliers.Count(supplier =>
            SameAddress(supplier.BankAddress, bankAddress));
    }

    private StorageUnitView ToView(StorageUnit unit)
    {
        var supplier = FindSupplier(unit.SupplierCode);
        var material = FindMaterial(unit.MaterialCode);
        var measurementUnit = _measurementUnits.First(item =>
            item.MaterialCode == unit.MaterialCode && item.UnitCode == unit.UnitCode);

        return new StorageUnitView(
            unit.OrderNumber,
            unit.OrderDate,
            supplier.Name,
            material.Name,
            measurementUnit.UnitName,
            unit.Quantity,
            unit.UnitPrice,
            unit.Quantity * unit.UnitPrice,
            unit.DocumentNumber);
    }

    private void ValidateRequest(StorageUnitCreateRequest request)
    {
        _ = FindSupplier(request.SupplierCode);
        var material = FindMaterial(request.MaterialCode);

        if (!_documentTypes.Any(document => document.Code == request.DocumentTypeCode))
        {
            throw new InvalidOperationException("Неизвестный код сопроводительного документа.");
        }

        if (!_measurementUnits.Any(unit =>
            unit.MaterialCode == request.MaterialCode && unit.UnitCode == request.UnitCode))
        {
            throw new InvalidOperationException("Для выбранного материала нет такой единицы измерения.");
        }

        if (request.Quantity <= 0 || request.UnitPrice <= 0)
        {
            throw new InvalidOperationException("Количество и цена должны быть больше нуля.");
        }

        if (!string.Equals(material.MaterialAccount, request.MaterialAccount, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Счет материала не соответствует справочнику материалов.");
        }
    }

    private Supplier FindSupplier(string code) =>
        _suppliers.FirstOrDefault(supplier => supplier.Code.Equals(code, StringComparison.OrdinalIgnoreCase))
        ?? throw new InvalidOperationException("Поставщик не найден.");

    private Material FindMaterial(string code) =>
        _materials.FirstOrDefault(material => material.Code.Equals(code, StringComparison.OrdinalIgnoreCase))
        ?? throw new InvalidOperationException("Материал не найден.");

    private static bool SameAddress(Address left, Address right) =>
        Same(left.PostalCode, right.PostalCode)
        && Same(left.City, right.City)
        && Same(left.Street, right.Street)
        && Same(left.House, right.House);

    private static bool Same(string left, string right) =>
        string.Equals(left.Trim(), right.Trim(), StringComparison.OrdinalIgnoreCase);
}
