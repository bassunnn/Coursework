# Database Map информационной системы "Складской учет материалов"

## Назначение

Карта базы данных показывает таблицы схемы `warehouse`, ключевые поля и связи между таблицами. Схема построена по файлу `database/warehouse.sql`.

Готовые файлы:

- `DatabaseMap_Warehouse.svg`
- `DatabaseMap_Warehouse.png`

## Таблицы

| Таблица | Назначение |
| --- | --- |
| `suppliers` | Справочник поставщиков, ИНН, юридический адрес, банковский адрес и расчетный счет. |
| `materials` | Справочник материалов: код, класс, группа, название и учетный счет. |
| `measurement_units` | Единицы измерения, доступные для каждого материала. |
| `document_types` | Типы сопроводительных документов. |
| `storage_units` | Приходные складские записи с поставщиком, материалом, документом, количеством, ценой и итоговой суммой. |

## Связи

| Родительская таблица | Дочерняя таблица | Поле связи |
| --- | --- | --- |
| `suppliers` | `storage_units` | `supplier_code` |
| `materials` | `measurement_units` | `material_code` |
| `materials` | `storage_units` | `material_code` |
| `document_types` | `storage_units` | `document_type_code` |
| `measurement_units` | `storage_units` | `(material_code, unit_code)` |

## Особенности

| Элемент | Описание |
| --- | --- |
| `storage_units.total_price` | Вычисляемое поле: `quantity * unit_price`. |
| `quantity`, `unit_price` | Имеют ограничения `CHECK > 0`. |
| `measurement_units` | При удалении единицы измерения связанные приходные записи удаляются триггером. |
| `suppliers` | Удаление поставщика блокируется, если у него есть приходные записи. |
| `materials.material_account` | При изменении счета материала значение синхронизируется в `storage_units`. |

