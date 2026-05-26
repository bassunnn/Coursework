using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Warehouse.Api.Models;
using Warehouse.Api.Services;

namespace Warehouse.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/warehouse")]
public sealed class WarehouseController(IWarehouseRepository repository) : ControllerBase
{
    [HttpGet("materials")]
    public IActionResult GetMaterials() => Ok(repository.GetMaterials());

    [HttpGet("suppliers")]
    public IActionResult GetSuppliers() => Ok(repository.GetSuppliers());

    [HttpGet("documents")]
    public IActionResult GetDocumentTypes() => Ok(repository.GetDocumentTypes());

    [HttpGet("measurement-units")]
    public IActionResult GetMeasurementUnits([FromQuery] string? materialCode = null) =>
        Ok(repository.GetMeasurementUnits(materialCode));

    [HttpGet("storage-units")]
    public IActionResult GetStorageUnits() => Ok(repository.GetStorageUnits());

    [HttpGet("stock-balances")]
    public IActionResult GetStockBalances() => Ok(repository.GetStockBalances());

    [HttpGet("shipments")]
    public IActionResult GetShipments() => Ok(repository.GetShipments());

    [HttpPost("storage-units")]
    public IActionResult AddStorageUnit(StorageUnitCreateRequest request)
    {
        try
        {
            return CreatedAtAction(nameof(GetStorageUnits), repository.AddStorageUnit(request));
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPost("shipments")]
    public IActionResult AddShipment(ShipmentCreateRequest request)
    {
        try
        {
            return CreatedAtAction(nameof(GetShipments), repository.AddShipment(request));
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("storage-units/{orderNumber:int}")]
    public IActionResult DeleteStorageUnit(int orderNumber) =>
        repository.DeleteStorageUnit(orderNumber)
            ? NoContent()
            : NotFound(new { message = "Приход с таким номером ордера не найден." });

    [Authorize(Roles = "admin")]
    [HttpDelete("storage-units")]
    public IActionResult ClearStorageUnits() =>
        Ok(new { deleted = repository.ClearStorageUnits() });

    [Authorize(Roles = "admin")]
    [HttpDelete("shipments/{shipmentNumber:int}")]
    public IActionResult DeleteShipment(int shipmentNumber) =>
        repository.DeleteShipment(shipmentNumber)
            ? NoContent()
            : NotFound(new { message = "Расход с таким номером не найден." });

    [Authorize(Roles = "admin")]
    [HttpDelete("shipments")]
    public IActionResult ClearShipments() =>
        Ok(new { deleted = repository.ClearShipments() });

    [HttpGet("materials/{materialCode}/supplier-count")]
    public IActionResult CountSuppliersForMaterial(string materialCode) =>
        Ok(new { materialCode, count = repository.CountSuppliersForMaterial(materialCode) });

    [HttpGet("materials/{materialCode}/suppliers")]
    public IActionResult GetSuppliersForMaterial(string materialCode)
    {
        try
        {
            return Ok(repository.GetSuppliersForMaterial(materialCode));
        }
        catch (InvalidOperationException exception)
        {
            return NotFound(new { message = exception.Message });
        }
    }

    [HttpPost("suppliers/bank-address-count")]
    public IActionResult CountSuppliersByBankAddress(Address bankAddress) =>
        Ok(new { count = repository.CountSuppliersByBankAddress(bankAddress) });
}
