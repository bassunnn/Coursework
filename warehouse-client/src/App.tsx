import type { FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5064/api/warehouse'
const AUTH_URL = API_URL.replace(/\/api\/warehouse$/, '/api/auth')
const TOKEN_KEY = 'warehouse-auth-token'
const INVITATION_CODES = ['INVITE-2026', 'WAREHOUSE-ACCESS']

type Address = {
  postalCode: string
  city: string
  street: string
  house: string
}

type Material = {
  code: string
  classCode: string
  groupCode: string
  name: string
  materialAccount: string
}

type Supplier = {
  code: string
  name: string
  inn: string
  legalAddress: Address
  bankAddress: Address
  bankAccountNumber: string
}

type DocumentType = {
  code: string
  name: string
}

type MeasurementUnit = {
  materialCode: string
  unitCode: string
  unitName: string
}

type StorageUnit = {
  orderNumber: number
  orderDate: string
  supplierName: string
  materialName: string
  unitName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  documentNumber: string
}

type SupplierForMaterial = {
  supplierCode: string
  supplierName: string
  inn: string
  legalAddress: Address
  bankAddress: Address
  bankAccountNumber: string
  totalQuantity: number
  totalAmount: number
}

type StorageUnitForm = {
  orderNumber: string
  orderDate: string
  supplierCode: string
  balanceAccount: string
  documentTypeCode: string
  documentNumber: string
  materialCode: string
  materialAccount: string
  unitCode: string
  quantity: string
  unitPrice: string
}

type AuthUser = {
  email: string
  name: string
}

type AuthResponse = {
  token: string
  user: AuthUser
}

type AuthForm = {
  email: string
  name: string
  password: string
  invitationCode: string
}

const emptyAddress: Address = {
  postalCode: '',
  city: '',
  street: '',
  house: '',
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '')
  const [, setCurrentUser] = useState<AuthUser | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authForm, setAuthForm] = useState<AuthForm>({
    email: '',
    name: '',
    password: '',
    invitationCode: '',
  })
  const [materials, setMaterials] = useState<Material[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [documents, setDocuments] = useState<DocumentType[]>([])
  const [measurementUnits, setMeasurementUnits] = useState<MeasurementUnit[]>([])
  const [storageUnits, setStorageUnits] = useState<StorageUnit[]>([])
  const [selectedMaterial, setSelectedMaterial] = useState('MAT-001')
  const [supplierReport, setSupplierReport] = useState<SupplierForMaterial[]>([])
  const [supplierCount, setSupplierCount] = useState(0)
  const [bankAddress, setBankAddress] = useState<Address>({
    postalCode: '101000',
    city: 'Москва',
    street: 'Мясницкая',
    house: '12',
  })
  const [bankCount, setBankCount] = useState<number | null>(null)
  const [isDarkTheme, setIsDarkTheme] = useState(false)
  const [isMaterialsListOpen, setIsMaterialsListOpen] = useState(false)
  const [materialSearch, setMaterialSearch] = useState('')
  const [isStorageListOpen, setIsStorageListOpen] = useState(false)
  const [storageSearch, setStorageSearch] = useState('')
  const [isSupplierReportOpen, setIsSupplierReportOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState<StorageUnitForm>({
    orderNumber: '1005',
    orderDate: new Date().toISOString().slice(0, 10),
    supplierCode: 'SUP-001',
    balanceAccount: '15',
    documentTypeCode: 'WAY',
    documentNumber: 'ТН-501',
    materialCode: 'MAT-001',
    materialAccount: '10.01',
    unitCode: 'KG',
    quantity: '100',
    unitPrice: '90',
  })

  const unitsForMaterial = useMemo(
    () => measurementUnits.filter((unit) => unit.materialCode === form.materialCode),
    [form.materialCode, measurementUnits],
  )

  const latestMaterials = useMemo(() => materials.slice(-4).reverse(), [materials])

  const filteredMaterials = useMemo(() => {
    const search = materialSearch.trim().toLowerCase()

    if (!search) {
      return materials
    }

    return materials.filter((material) =>
      [material.code, material.classCode, material.groupCode, material.name, material.materialAccount].some((value) =>
        value.toLowerCase().includes(search),
      ),
    )
  }, [materialSearch, materials])

  const latestStorageUnits = useMemo(() => storageUnits.slice(-4).reverse(), [storageUnits])

  const filteredStorageUnits = useMemo(() => {
    const search = storageSearch.trim().toLowerCase()

    if (!search) {
      return storageUnits
    }

    return storageUnits.filter((unit) =>
      [
        String(unit.orderNumber),
        formatDate(unit.orderDate),
        unit.supplierName,
        unit.materialName,
        unit.unitName,
        String(unit.quantity),
        String(unit.unitPrice),
        String(unit.totalPrice),
        unit.documentNumber,
      ].some((value) => value.toLowerCase().includes(search)),
    )
  }, [storageSearch, storageUnits])

  const visibleSupplierReport = useMemo(
    () => (isSupplierReportOpen ? supplierReport : supplierReport.slice(0, 4)),
    [isSupplierReportOpen, supplierReport],
  )

  useEffect(() => {
    if (!token) {
      setCurrentUser(null)
      return
    }

    localStorage.setItem(TOKEN_KEY, token)
    void loadCurrentUser(token)
    void loadInitialData(token)
  }, [token])

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkTheme ? 'dark' : 'light'
  }, [isDarkTheme])

  useEffect(() => {
    const material = materials.find((item) => item.code === form.materialCode)
    const firstUnit = measurementUnits.find((unit) => unit.materialCode === form.materialCode)

    setForm((current) => ({
      ...current,
      materialAccount: material?.materialAccount ?? current.materialAccount,
      unitCode: firstUnit?.unitCode ?? current.unitCode,
    }))
  }, [form.materialCode, materials, measurementUnits])

  useEffect(() => {
    if (token && selectedMaterial) {
      void loadMaterialReport(selectedMaterial, token)
    }
  }, [selectedMaterial, token])

  async function loadCurrentUser(authToken: string) {
    try {
      setCurrentUser(await authApi<AuthUser>('/me', undefined, authToken))
    } catch {
      handleLogout()
    }
  }

  async function loadInitialData(authToken = token) {
    try {
      const [materialsData, suppliersData, documentsData, unitsData, storageData] = await Promise.all([
        api<Material[]>('/materials', undefined, authToken),
        api<Supplier[]>('/suppliers', undefined, authToken),
        api<DocumentType[]>('/documents', undefined, authToken),
        api<MeasurementUnit[]>('/measurement-units', undefined, authToken),
        api<StorageUnit[]>('/storage-units', undefined, authToken),
      ])

      setMaterials(materialsData)
      setSuppliers(suppliersData)
      setDocuments(documentsData)
      setMeasurementUnits(unitsData)
      setStorageUnits(storageData)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось загрузить данные')
    }
  }

  async function loadMaterialReport(materialCode: string, authToken = token) {
    if (!authToken) {
      return
    }

    try {
      const [suppliersData, countData] = await Promise.all([
        api<SupplierForMaterial[]>(`/materials/${materialCode}/suppliers`, undefined, authToken),
        api<{ count: number }>(`/materials/${materialCode}/supplier-count`, undefined, authToken),
      ])
      setSupplierReport(suppliersData)
      setSupplierCount(countData.count)
    } catch {
      setSupplierReport([])
      setSupplierCount(0)
    }
  }

  async function handleStorageSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      await api(
        '/storage-units',
        {
          method: 'POST',
          body: JSON.stringify({
            ...form,
            orderNumber: Number(form.orderNumber),
            quantity: Number(form.quantity),
            unitPrice: Number(form.unitPrice),
          }),
        },
        token,
      )
      setMessage('Единица хранения добавлена')
      await loadInitialData()
      await loadMaterialReport(selectedMaterial)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ошибка добавления')
    }
  }

  async function handleBankSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      const result = await api<{ count: number }>(
        '/suppliers/bank-address-count',
        {
          method: 'POST',
          body: JSON.stringify(bankAddress),
        },
        token,
      )
      setBankCount(result.count)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ошибка расчета')
    }
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      const result = await authApi<AuthResponse>(authMode === 'login' ? '/login' : '/register', {
        method: 'POST',
        body: JSON.stringify(
          authMode === 'login'
            ? { email: authForm.email, password: authForm.password }
            : authForm,
        ),
      })

      setCurrentUser(result.user)
      setToken(result.token)
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось выполнить вход')
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setCurrentUser(null)
    setMaterials([])
    setSuppliers([])
    setDocuments([])
    setMeasurementUnits([])
    setStorageUnits([])
    setSupplierReport([])
    setSupplierCount(0)
    setMessage('Войдите, чтобы работать со складом')
  }

  const selectedMaterialName =
    materials.find((material) => material.code === selectedMaterial)?.name ?? selectedMaterial

  if (!token) {
    return (
      <main className="app-shell auth-shell">
        <section className="panel auth-panel">
          <div className="panel-heading">
            <div>
              <h1>Складской учет</h1>
              <p>{authMode === 'login' ? 'Вход для сотрудников' : 'Регистрация по приглашению'}</p>
            </div>
            <button
              type="button"
              onClick={() => setAuthMode((current) => (current === 'login' ? 'register' : 'login'))}
            >
              {authMode === 'login' ? 'Регистрация' : 'Войти'}
            </button>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <Field label="Почта">
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthFormValue('email', event.target.value)}
                required
              />
            </Field>
            {authMode === 'register' && (
              <Field label="Имя">
                <input
                  value={authForm.name}
                  onChange={(event) => setAuthFormValue('name', event.target.value)}
                  required
                />
              </Field>
            )}
            <Field label="Пароль">
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthFormValue('password', event.target.value)}
                required
              />
            </Field>
            {authMode === 'register' && (
              <Field label="Код приглашения">
                <input
                  value={authForm.invitationCode}
                  onChange={(event) => setAuthFormValue('invitationCode', event.target.value)}
                  required
                />
              </Field>
            )}
            <button type="submit">{authMode === 'login' ? 'Войти' : 'Создать аккаунт'}</button>
            {message && <span className="status">{message}</span>}
          </form>
        </section>

        {authMode === 'register' && (
          <aside className="panel invitation-panel">
            <div className="panel-heading">
              <div>
                <h2>Коды приглашения</h2>
                <p>Нажмите на код, чтобы подставить его в форму регистрации</p>
              </div>
            </div>
            <div className="invitation-codes">
              {INVITATION_CODES.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setAuthFormValue('invitationCode', code)}
                >
                  {code}
                </button>
              ))}
            </div>
          </aside>
        )}
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Складской учет материалов</h1>
        </div>
        <div className="topbar-actions">
          <button
            className="theme-toggle"
            type="button"
            aria-pressed={isDarkTheme}
            onClick={() => setIsDarkTheme((current) => !current)}
          >
            {isDarkTheme ? 'Светлая тема' : 'Темная тема'}
          </button>
          <button type="button" onClick={handleLogout}>Выйти</button>
          {message && <span className="status">{message}</span>}
        </div>
      </header>

      <section className="metrics" aria-label="Показатели склада">
        <Metric label="Материалов" value={materials.length} />
        <Metric label="Поставщиков" value={suppliers.length} />
        <Metric label="Единиц хранения" value={storageUnits.length} />
        <Metric
          label="Остаток по приходу"
          value={formatMoney(storageUnits.reduce((sum, unit) => sum + unit.totalPrice, 0))}
        />
      </section>

      <section className="panel materials-panel">
        <div className="panel-heading">
          <div>
            <h2>Последние материалы</h2>
            <p>Показаны 4 последних материала из справочника</p>
          </div>
          <button type="button" onClick={() => setIsMaterialsListOpen((current) => !current)}>
            {isMaterialsListOpen ? 'Скрыть все материалы' : 'Ко всем материалам'}
          </button>
        </div>

        <div className="materials-preview">
          {latestMaterials.map((material) => (
            <article className="material-card" key={material.code}>
              <strong>{material.name}</strong>
              <span>Код: {material.code}</span>
              <span>Класс: {material.classCode}</span>
              <span>Группа: {material.groupCode}</span>
              <b>Счет: {material.materialAccount}</b>
            </article>
          ))}
        </div>

        {isMaterialsListOpen && (
          <div className="materials-all">
            <Field label="Поиск по материалам">
              <input
                placeholder="Название, код, класс, группа или счет"
                value={materialSearch}
                onChange={(event) => setMaterialSearch(event.target.value)}
              />
            </Field>
            <div className="table-wrap">
              <table className="materials-table">
                <thead>
                  <tr>
                    <th>Код</th>
                    <th>Наименование</th>
                    <th>Класс</th>
                    <th>Группа</th>
                    <th>Счет</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map((material) => (
                    <tr key={material.code}>
                      <td>{material.code}</td>
                      <td>{material.name}</td>
                      <td>{material.classCode}</td>
                      <td>{material.groupCode}</td>
                      <td>{material.materialAccount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="workspace">
        <form className="panel form-panel" onSubmit={handleStorageSubmit}>
          <div className="panel-heading">
            <h2>Добавление единицы хранения</h2>
            <button type="submit">Добавить</button>
          </div>

          <div className="form-grid">
            <Field label="Номер ордера">
              <input value={form.orderNumber} onChange={(event) => setFormValue('orderNumber', event.target.value)} />
            </Field>
            <Field label="Дата">
              <input type="date" value={form.orderDate} onChange={(event) => setFormValue('orderDate', event.target.value)} />
            </Field>
            <Field label="Поставщик">
              <select value={form.supplierCode} onChange={(event) => setFormValue('supplierCode', event.target.value)}>
                {suppliers.map((supplier) => (
                  <option key={supplier.code} value={supplier.code}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Балансовый счет">
              <input value={form.balanceAccount} onChange={(event) => setFormValue('balanceAccount', event.target.value)} />
            </Field>
            <Field label="Документ">
              <select
                value={form.documentTypeCode}
                onChange={(event) => setFormValue('documentTypeCode', event.target.value)}
              >
                {documents.map((document) => (
                  <option key={document.code} value={document.code}>
                    {document.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Номер документа">
              <input value={form.documentNumber} onChange={(event) => setFormValue('documentNumber', event.target.value)} />
            </Field>
            <Field label="Материал">
              <select value={form.materialCode} onChange={(event) => setFormValue('materialCode', event.target.value)}>
                {materials.map((material) => (
                  <option key={material.code} value={material.code}>
                    {material.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Счет материала">
              <input value={form.materialAccount} onChange={(event) => setFormValue('materialAccount', event.target.value)} />
            </Field>
            <Field label="Единица измерения">
              <select value={form.unitCode} onChange={(event) => setFormValue('unitCode', event.target.value)}>
                {unitsForMaterial.map((unit) => (
                  <option key={unit.unitCode} value={unit.unitCode}>
                    {unit.unitName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Количество">
              <input value={form.quantity} onChange={(event) => setFormValue('quantity', event.target.value)} />
            </Field>
            <Field label="Цена">
              <input value={form.unitPrice} onChange={(event) => setFormValue('unitPrice', event.target.value)} />
            </Field>
          </div>
        </form>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Приход на склад</h2>
              <p>Показаны 4 последних прихода</p>
            </div>
            <button type="button" onClick={() => setIsStorageListOpen((current) => !current)}>
              {isStorageListOpen ? 'Скрыть весь приход' : 'Ко всему приходу'}
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ордер</th>
                  <th>Дата</th>
                  <th>Поставщик</th>
                  <th>Материал</th>
                  <th>Кол-во</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {latestStorageUnits.map((unit) => (
                  <tr key={unit.orderNumber}>
                    <td>{unit.orderNumber}</td>
                    <td>{formatDate(unit.orderDate)}</td>
                    <td>{unit.supplierName}</td>
                    <td>{unit.materialName}</td>
                    <td>
                      {unit.quantity} {unit.unitName}
                    </td>
                    <td>{formatMoney(unit.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isStorageListOpen && (
            <div className="storage-all">
              <Field label="Поиск по приходу">
                <input
                  placeholder="Ордер, дата, поставщик, материал, документ или сумма"
                  value={storageSearch}
                  onChange={(event) => setStorageSearch(event.target.value)}
                />
              </Field>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ордер</th>
                      <th>Дата</th>
                      <th>Поставщик</th>
                      <th>Материал</th>
                      <th>Документ</th>
                      <th>Кол-во</th>
                      <th>Цена</th>
                      <th>Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStorageUnits.map((unit) => (
                      <tr key={unit.orderNumber}>
                        <td>{unit.orderNumber}</td>
                        <td>{formatDate(unit.orderDate)}</td>
                        <td>{unit.supplierName}</td>
                        <td>{unit.materialName}</td>
                        <td>{unit.documentNumber}</td>
                        <td>
                          {unit.quantity} {unit.unitName}
                        </td>
                        <td>{formatMoney(unit.unitPrice)}</td>
                        <td>{formatMoney(unit.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </section>

      <section className="reports">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Поставщики материала</h2>
              <p>{supplierCount} поставщика для: {selectedMaterialName}</p>
            </div>
            <div className="report-actions">
              <Field label="Материал для отчета">
                <select value={selectedMaterial} onChange={(event) => setSelectedMaterial(event.target.value)}>
                  {materials.map((material) => (
                    <option key={material.code} value={material.code}>
                      {material.name}
                    </option>
                  ))}
                </select>
              </Field>
              <button type="button" onClick={() => setIsSupplierReportOpen((current) => !current)}>
                {isSupplierReportOpen ? 'Скрыть всех поставщиков' : 'Ко всем поставщикам'}
              </button>
            </div>
          </div>
          <div className="supplier-list">
            {visibleSupplierReport.map((supplier) => (
              <article className="supplier-card" key={supplier.supplierCode}>
                <strong>{supplier.supplierName}</strong>
                <span>ИНН {supplier.inn}</span>
                <span>{formatAddress(supplier.legalAddress)}</span>
                <span>Банк: {formatAddress(supplier.bankAddress)}</span>
                <span>Счет: {supplier.bankAccountNumber}</span>
                <b>{formatMoney(supplier.totalAmount)}</b>
              </article>
            ))}
          </div>
        </section>

        <form className="panel" onSubmit={handleBankSubmit}>
          <div className="panel-heading">
            <div>
              <h2>Поставщики по адресу банка</h2>
              <p>{bankCount === null ? 'Введите адрес банка' : `Найдено: ${bankCount}`}</p>
            </div>
            <button type="submit">Посчитать</button>
          </div>
          <div className="address-grid">
            <Field label="Индекс банка">
              <input
                placeholder="101000"
                value={bankAddress.postalCode}
                onChange={(event) => setBankAddressValue('postalCode', event.target.value)}
              />
            </Field>
            <Field label="Город банка">
              <input
                placeholder="Москва"
                value={bankAddress.city}
                onChange={(event) => setBankAddressValue('city', event.target.value)}
              />
            </Field>
            <Field label="Улица банка">
              <input
                placeholder="Мясницкая"
                value={bankAddress.street}
                onChange={(event) => setBankAddressValue('street', event.target.value)}
              />
            </Field>
            <Field label="Дом банка">
              <input
                placeholder="12"
                value={bankAddress.house}
                onChange={(event) => setBankAddressValue('house', event.target.value)}
              />
            </Field>
          </div>
        </form>
      </section>
    </main>
  )

  function setFormValue(field: keyof StorageUnitForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function setBankAddressValue(field: keyof Address, value: string) {
    setBankAddress((current) => ({ ...current, [field]: value }))
  }

  function setAuthFormValue(field: keyof AuthForm, value: string) {
    setAuthForm((current) => ({ ...current, [field]: value }))
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

async function api<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message ?? 'Сервер вернул ошибку')
  }

  return response.json()
}

async function authApi<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const response = await fetch(`${AUTH_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message ?? 'Сервер вернул ошибку')
  }

  return response.json()
}

function formatAddress(address: Address = emptyAddress) {
  return `${address.postalCode}, ${address.city}, ${address.street}, ${address.house}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU').format(new Date(value))
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value)
}

export default App
