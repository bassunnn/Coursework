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
