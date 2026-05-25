using Npgsql;
using Warehouse.Api.Models;

namespace Warehouse.Api.Services;

public sealed class PostgresWarehouseRepository(NpgsqlDataSource dataSource) : IWarehouseRepository
{
    public IReadOnlyCollection<Material> GetMaterials()
    {
        using var command = dataSource.CreateCommand("""
            SELECT material_code, material_class_code, material_group_code, material_name, material_account
            FROM warehouse.materials
            ORDER BY material_name;
            """);

        using var reader = command.ExecuteReader();
        var items = new List<Material>();

        while (reader.Read())
        {
            items.Add(new Material(
                reader.GetString(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetString(4)));
        }

        return items;
    }

    public IReadOnlyCollection<Supplier> GetSuppliers()
    {
        using var command = dataSource.CreateCommand("""
            SELECT supplier_code, supplier_name, inn,
                   legal_postal_code, legal_city, legal_street, legal_house,
                   bank_postal_code, bank_city, bank_street, bank_house,
                   bank_account_number
            FROM warehouse.suppliers
            ORDER BY supplier_name;
            """);

        using var reader = command.ExecuteReader();
        var items = new List<Supplier>();

        while (reader.Read())
        {
            items.Add(ReadSupplier(reader));
        }

        return items;
    }

    public IReadOnlyCollection<DocumentType> GetDocumentTypes()
    {
        using var command = dataSource.CreateCommand("""
            SELECT document_type_code, document_type_name
            FROM warehouse.document_types
            ORDER BY document_type_name;
            """);

        using var reader = command.ExecuteReader();
        var items = new List<DocumentType>();

        while (reader.Read())
        {
            items.Add(new DocumentType(reader.GetString(0), reader.GetString(1)));
        }

        return items;
    }

    public IReadOnlyCollection<MeasurementUnit> GetMeasurementUnits(string? materialCode = null)
    {
        using var command = dataSource.CreateCommand("""
            SELECT material_code, unit_code, unit_name
            FROM warehouse.measurement_units
            WHERE @material_code IS NULL OR material_code = @material_code
            ORDER BY unit_name;
            """);
        command.Parameters.AddWithValue("material_code", (object?)materialCode ?? DBNull.Value);

        using var reader = command.ExecuteReader();
        var items = new List<MeasurementUnit>();

        while (reader.Read())
        {
            items.Add(new MeasurementUnit(reader.GetString(0), reader.GetString(1), reader.GetString(2)));
        }

        return items;
    }

    public IReadOnlyCollection<StorageUnitView> GetStorageUnits()
    {
        using var command = dataSource.CreateCommand("""
            SELECT u.order_number, u.order_date, s.supplier_name, m.material_name, mu.unit_name,
                   u.quantity, u.unit_price, u.total_price, u.document_number
            FROM warehouse.storage_units AS u
            JOIN warehouse.suppliers AS s ON s.supplier_code = u.supplier_code
            JOIN warehouse.materials AS m ON m.material_code = u.material_code
            JOIN warehouse.measurement_units AS mu
              ON mu.material_code = u.material_code
             AND mu.unit_code = u.unit_code
            ORDER BY u.order_date DESC, u.order_number DESC;
            """);

        using var reader = command.ExecuteReader();
        var items = new List<StorageUnitView>();

        while (reader.Read())
        {
            items.Add(new StorageUnitView(
                reader.GetInt32(0),
                reader.GetFieldValue<DateOnly>(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetString(4),
                reader.GetDecimal(5),
                reader.GetDecimal(6),
                reader.GetDecimal(7),
                reader.GetString(8)));
        }

        return items;
    }

    public StorageUnit AddStorageUnit(StorageUnitCreateRequest request)
    {
        using var command = dataSource.CreateCommand("""
            CALL warehouse.add_storage_unit(
                @order_number,
                @order_date,
                @supplier_code,
                @balance_account,
                @document_type_code,
                @document_number,
                @material_code,
                @material_account,
                @unit_code,
                @quantity,
                @unit_price
            );
            """);

        command.Parameters.AddWithValue("order_number", request.OrderNumber);
        command.Parameters.AddWithValue("order_date", request.OrderDate);
        command.Parameters.AddWithValue("supplier_code", request.SupplierCode);
        command.Parameters.AddWithValue("balance_account", request.BalanceAccount);
        command.Parameters.AddWithValue("document_type_code", request.DocumentTypeCode);
        command.Parameters.AddWithValue("document_number", request.DocumentNumber);
        command.Parameters.AddWithValue("material_code", request.MaterialCode);
        command.Parameters.AddWithValue("material_account", request.MaterialAccount);
        command.Parameters.AddWithValue("unit_code", request.UnitCode);
        command.Parameters.AddWithValue("quantity", request.Quantity);
        command.Parameters.AddWithValue("unit_price", request.UnitPrice);

        try
        {
            command.ExecuteNonQuery();
        }
        catch (PostgresException exception)
        {
            throw new InvalidOperationException(exception.MessageText, exception);
        }

        return new StorageUnit(
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
    }

    public int CountSuppliersForMaterial(string materialCode)
    {
        using var command = dataSource.CreateCommand("SELECT warehouse.count_suppliers_for_material(@material_code);");
        command.Parameters.AddWithValue("material_code", materialCode);
        return Convert.ToInt32(command.ExecuteScalar());
    }

    public IReadOnlyCollection<SupplierForMaterialView> GetSuppliersForMaterial(string materialCode)
    {
        using var command = dataSource.CreateCommand("SELECT * FROM warehouse.get_suppliers_for_material(@material_code);");
        command.Parameters.AddWithValue("material_code", materialCode);

        using var reader = command.ExecuteReader();
        var items = new List<SupplierForMaterialView>();

        while (reader.Read())
        {
            items.Add(new SupplierForMaterialView(
                reader.GetString(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetString(4),
                new Address(reader.GetString(5), reader.GetString(6), reader.GetString(7), reader.GetString(8)),
                new Address(reader.GetString(9), reader.GetString(10), reader.GetString(11), reader.GetString(12)),
                reader.GetString(13),
                reader.GetDecimal(14),
                reader.GetDecimal(15)));
        }

        return items;
    }

    public int CountSuppliersByBankAddress(Address bankAddress)
    {
        using var command = dataSource.CreateCommand("""
            SELECT warehouse.count_suppliers_by_bank_address(
                @bank_postal_code,
                @bank_city,
                @bank_street,
                @bank_house
            );
            """);
        command.Parameters.AddWithValue("bank_postal_code", bankAddress.PostalCode);
        command.Parameters.AddWithValue("bank_city", bankAddress.City);
        command.Parameters.AddWithValue("bank_street", bankAddress.Street);
        command.Parameters.AddWithValue("bank_house", bankAddress.House);

        return Convert.ToInt32(command.ExecuteScalar());
    }

    private static Supplier ReadSupplier(NpgsqlDataReader reader) =>
        new(
            reader.GetString(0),
            reader.GetString(1),
            reader.GetString(2),
            new Address(reader.GetString(3), reader.GetString(4), reader.GetString(5), reader.GetString(6)),
            new Address(reader.GetString(7), reader.GetString(8), reader.GetString(9), reader.GetString(10)),
            reader.GetString(11));
}

