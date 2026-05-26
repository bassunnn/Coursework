# Docker

Start the full app:

```powershell
docker compose up --build
```

Open:

- Client: http://localhost:5173
- API: http://localhost:5064
- PostgreSQL: localhost:5432

Stop containers:

```powershell
docker compose down
```

Reset database data and rerun `database/warehouse.sql` on the next start:

```powershell
docker compose down -v
```
