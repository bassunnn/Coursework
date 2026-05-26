# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Warehouse.Api/Warehouse.Api.csproj Warehouse.Api/
RUN dotnet restore Warehouse.Api/Warehouse.Api.csproj

COPY Warehouse.Api/ Warehouse.Api/
RUN dotnet publish Warehouse.Api/Warehouse.Api.csproj \
    --configuration Release \
    --output /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Warehouse.Api.dll"]
