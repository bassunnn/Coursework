import type { FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5064/api/warehouse'
const AUTH_URL = API_URL.replace(/\/api\/warehouse$/, '/api/auth')
const TOKEN_KEY = 'warehouse-auth-token'
const INVITATION_CODES = ['INVITE-2026', 'WAREHOUSE-ACCESS']
const TABLE_PREVIEW_LIMIT = 4

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

type Shipment = {
  shipmentNumber: number
  shipmentDate: string
  destination: string
  materialName: string
  unitName: string
  quantity: number
  documentNumber: string
  comment: string
}

type StockBalance = {
  materialCode: string
  materialName: string
  unitCode: string
  unitName: string
  receivedQuantity: number
  shippedQuantity: number
  availableQuantity: number
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

type ShipmentForm = {
  shipmentNumber: string
  shipmentDate: string
  destination: string
  materialCode: string
  unitCode: string
  quantity: string
  documentNumber: string
  comment: string
}

type AuthUser = {
  email: string
  name: string
  role: 'admin' | 'employee' | string
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

type AdminUserForm = {
  email: string
  name: string
  password: string
  role: 'employee' | 'admin'
}

type ViewId = 'overview' | 'receipt' | 'shipment' | 'directories' | 'reports' | 'admin'

const emptyAddress: Address = {
  postalCode: '',
  city: '',
  street: '',
  house: '',
}

const today = new Date().toISOString().slice(0, 10)

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '')
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [activeView, setActiveView] = useState<ViewId>('overview')
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
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [stockBalances, setStockBalances] = useState<StockBalance[]>([])
  const [adminUsers, setAdminUsers] = useState<AuthUser[]>([])
  const [adminInvitationCodes, setAdminInvitationCodes] = useState<string[]>([])

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
  const [materialSearch, setMaterialSearch] = useState('')
  const [storageSearch, setStorageSearch] = useState('')
  const [shipmentSearch, setShipmentSearch] = useState('')
  const [isSupplierReportOpen, setIsSupplierReportOpen] = useState(false)
  const [isReceiptJournalOpen, setIsReceiptJournalOpen] = useState(false)
  const [isShipmentJournalOpen, setIsShipmentJournalOpen] = useState(false)
  const [isStockBalancesOpen, setIsStockBalancesOpen] = useState(false)
  const [isAdminReceiptsOpen, setIsAdminReceiptsOpen] = useState(false)
  const [isAdminShipmentsOpen, setIsAdminShipmentsOpen] = useState(false)
  const [message, setMessage] = useState('')

  const [receiptForm, setReceiptForm] = useState<StorageUnitForm>({
    orderNumber: '1005',
    orderDate: today,
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

  const [shipmentForm, setShipmentForm] = useState<ShipmentForm>({
    shipmentNumber: '5003',
    shipmentDate: today,
    destination: 'Производственный участок',
    materialCode: 'MAT-001',
    unitCode: 'KG',
    quantity: '50',
    documentNumber: 'РН-103',
    comment: '',
  })

  const [adminUserForm, setAdminUserForm] = useState<AdminUserForm>({
    email: '',
    name: '',
    password: 'Warehouse123!',
    role: 'employee',
  })

  const isAdmin = currentUser?.role === 'admin'

  const receiptUnitsForMaterial = useMemo(
    () => measurementUnits.filter((unit) => unit.materialCode === receiptForm.materialCode),
    [measurementUnits, receiptForm.materialCode],
  )

  const shipmentUnitsForMaterial = useMemo(
    () => measurementUnits.filter((unit) => unit.materialCode === shipmentForm.materialCode),
    [measurementUnits, shipmentForm.materialCode],
  )

  const latestMaterials = useMemo(() => materials.slice(0, TABLE_PREVIEW_LIMIT), [materials])
  const latestStorageUnits = useMemo(() => storageUnits.slice(0, TABLE_PREVIEW_LIMIT), [storageUnits])
  const latestShipments = useMemo(() => shipments.slice(0, TABLE_PREVIEW_LIMIT), [shipments])

  const totalReceivedAmount = useMemo(
    () => storageUnits.reduce((sum, unit) => sum + unit.totalPrice, 0),
    [storageUnits],
  )

  const totalAvailableQuantity = useMemo(
    () => stockBalances.reduce((sum, balance) => sum + balance.availableQuantity, 0),
    [stockBalances],
  )

  const currentShipmentBalance = useMemo(
    () =>
      stockBalances.find(
        (balance) =>
          balance.materialCode === shipmentForm.materialCode && balance.unitCode === shipmentForm.unitCode,
      ),
    [shipmentForm.materialCode, shipmentForm.unitCode, stockBalances],
  )

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

  const filteredShipments = useMemo(() => {
    const search = shipmentSearch.trim().toLowerCase()
    if (!search) {
      return shipments
    }

    return shipments.filter((shipment) =>
      [
        String(shipment.shipmentNumber),
        formatDate(shipment.shipmentDate),
        shipment.destination,
        shipment.materialName,
        shipment.unitName,
        String(shipment.quantity),
        shipment.documentNumber,
        shipment.comment,
      ].some((value) => value.toLowerCase().includes(search)),
    )
  }, [shipmentSearch, shipments])

  const visibleStorageUnits = useMemo(
    () => (isReceiptJournalOpen ? filteredStorageUnits : filteredStorageUnits.slice(0, TABLE_PREVIEW_LIMIT)),
    [filteredStorageUnits, isReceiptJournalOpen],
  )

  const visibleShipments = useMemo(
    () => (isShipmentJournalOpen ? filteredShipments : filteredShipments.slice(0, TABLE_PREVIEW_LIMIT)),
    [filteredShipments, isShipmentJournalOpen],
  )

  const visibleStockBalances = useMemo(
    () => (isStockBalancesOpen ? stockBalances : stockBalances.slice(0, TABLE_PREVIEW_LIMIT)),
    [isStockBalancesOpen, stockBalances],
  )

  const visibleAdminStorageUnits = useMemo(
    () => (isAdminReceiptsOpen ? storageUnits : storageUnits.slice(0, TABLE_PREVIEW_LIMIT)),
    [isAdminReceiptsOpen, storageUnits],
  )

  const visibleAdminShipments = useMemo(
    () => (isAdminShipmentsOpen ? shipments : shipments.slice(0, TABLE_PREVIEW_LIMIT)),
    [isAdminShipmentsOpen, shipments],
  )

  const visibleSupplierReport = useMemo(
    () => (isSupplierReportOpen ? supplierReport : supplierReport.slice(0, TABLE_PREVIEW_LIMIT)),
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
    const material = materials.find((item) => item.code === receiptForm.materialCode)
    const firstUnit = measurementUnits.find((unit) => unit.materialCode === receiptForm.materialCode)

    setReceiptForm((current) => ({
      ...current,
      materialAccount: material?.materialAccount ?? current.materialAccount,
      unitCode: firstUnit?.unitCode ?? current.unitCode,
    }))
  }, [materials, measurementUnits, receiptForm.materialCode])

  useEffect(() => {
    const firstUnit = measurementUnits.find((unit) => unit.materialCode === shipmentForm.materialCode)

    setShipmentForm((current) => ({
      ...current,
      unitCode: firstUnit?.unitCode ?? current.unitCode,
    }))
  }, [measurementUnits, shipmentForm.materialCode])

  useEffect(() => {
    if (token && selectedMaterial) {
      void loadMaterialReport(selectedMaterial, token)
    }
  }, [selectedMaterial, token])

  useEffect(() => {
    if (token && isAdmin) {
      void loadAdminData(token)
    }
  }, [isAdmin, token])

  useEffect(() => {
    if (activeView === 'admin' && !isAdmin) {
      setActiveView('overview')
    }
  }, [activeView, isAdmin])

  async function loadCurrentUser(authToken: string) {
    try {
      setCurrentUser(await authApi<AuthUser>('/me', undefined, authToken))
    } catch {
      handleLogout()
    }
  }

  async function loadInitialData(authToken = token) {
    try {
      const [materialsData, suppliersData, documentsData, unitsData, storageData, shipmentsData, balancesData] =
        await Promise.all([
          api<Material[]>('/materials', undefined, authToken),
          api<Supplier[]>('/suppliers', undefined, authToken),
          api<DocumentType[]>('/documents', undefined, authToken),
          api<MeasurementUnit[]>('/measurement-units', undefined, authToken),
          api<StorageUnit[]>('/storage-units', undefined, authToken),
          api<Shipment[]>('/shipments', undefined, authToken),
          api<StockBalance[]>('/stock-balances', undefined, authToken),
        ])

      setMaterials(materialsData)
      setSuppliers(suppliersData)
      setDocuments(documentsData)
      setMeasurementUnits(unitsData)
      setStorageUnits(storageData)
      setShipments(shipmentsData)
      setStockBalances(balancesData)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось загрузить данные склада')
    }
  }

  async function loadAdminData(authToken = token) {
    try {
      const [usersData, invitationCodesData] = await Promise.all([
        authApi<AuthUser[]>('/users', undefined, authToken),
        authApi<string[]>('/invitation-codes', undefined, authToken),
      ])

      setAdminUsers(usersData)
      setAdminInvitationCodes(invitationCodesData)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось загрузить админские данные')
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

  async function handleReceiptSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      await api(
        '/storage-units',
        {
          method: 'POST',
          body: JSON.stringify({
            ...receiptForm,
            orderNumber: Number(receiptForm.orderNumber),
            quantity: Number(receiptForm.quantity),
            unitPrice: Number(receiptForm.unitPrice),
          }),
        },
        token,
      )
      setMessage('Приход добавлен')
      await loadInitialData()
      await loadMaterialReport(selectedMaterial)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ошибка добавления прихода')
    }
  }

  async function handleShipmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      await api(
        '/shipments',
        {
          method: 'POST',
          body: JSON.stringify({
            ...shipmentForm,
            shipmentNumber: Number(shipmentForm.shipmentNumber),
            quantity: Number(shipmentForm.quantity),
          }),
        },
        token,
      )
      setMessage('Расход оформлен')
      await loadInitialData()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ошибка оформления расхода')
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
      setMessage('Отчет обновлен')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ошибка расчета')
    }
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      const result = await authApi<AuthResponse>(authMode === 'login' ? '/login' : '/register', {
        method: 'POST',
        body: JSON.stringify(authMode === 'login' ? { email: authForm.email, password: authForm.password } : authForm),
      })

      setCurrentUser(result.user)
      setToken(result.token)
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось выполнить вход')
    }
  }

  async function handleAdminCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      await authApi<AuthUser>(
        '/users',
        {
          method: 'POST',
          body: JSON.stringify(adminUserForm),
        },
        token,
      )
      setAdminUserForm({
        email: '',
        name: '',
        password: 'Warehouse123!',
        role: 'employee',
      })
      setMessage('Пользователь создан')
      await loadAdminData()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось создать пользователя')
    }
  }

  async function handleDeleteStorageUnit(orderNumber: number) {
    if (!window.confirm(`Удалить приходный ордер ${orderNumber}?`)) {
      return
    }

    try {
      await api<void>(`/storage-units/${orderNumber}`, { method: 'DELETE' }, token)
      setMessage('Приход удален')
      await loadInitialData()
      await loadMaterialReport(selectedMaterial)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось удалить приход')
    }
  }

  async function handleClearStorageUnits() {
    if (!window.confirm('Удалить все приходные записи?')) {
      return
    }

    try {
      await api<{ deleted: number }>('/storage-units', { method: 'DELETE' }, token)
      setMessage('Приходы очищены')
      await loadInitialData()
      await loadMaterialReport(selectedMaterial)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось очистить приходы')
    }
  }

  async function handleDeleteShipment(shipmentNumber: number) {
    if (!window.confirm(`Удалить расход ${shipmentNumber}?`)) {
      return
    }

    try {
      await api<void>(`/shipments/${shipmentNumber}`, { method: 'DELETE' }, token)
      setMessage('Расход удален')
      await loadInitialData()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось удалить расход')
    }
  }

  async function handleClearShipments() {
    if (!window.confirm('Удалить все расходные записи?')) {
      return
    }

    try {
      await api<{ deleted: number }>('/shipments', { method: 'DELETE' }, token)
      setMessage('Расходы очищены')
      await loadInitialData()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось очистить расходы')
    }
  }

  async function handleDeleteEmployee(email: string) {
    if (!window.confirm(`Удалить аккаунт сотрудника ${email}?`)) {
      return
    }

    try {
      await authApi<void>(`/users/${encodeURIComponent(email)}`, { method: 'DELETE' }, token)
      setMessage('Сотрудник удален')
      await loadAdminData()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось удалить сотрудника')
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
    setShipments([])
    setStockBalances([])
    setSupplierReport([])
    setSupplierCount(0)
    setAdminUsers([])
    setAdminInvitationCodes([])
    setActiveView('overview')
    setMessage('Войдите, чтобы работать со складом')
  }

  const selectedMaterialName =
    materials.find((material) => material.code === selectedMaterial)?.name ?? selectedMaterial

  if (!token) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-copy">
            <span className="kicker">Складской учет</span>
            <h1>{authMode === 'login' ? 'Вход в рабочее место' : 'Регистрация сотрудника'}</h1>
            <p>Приходы, расходы, остатки, справочники и отчеты собраны в один рабочий экран.</p>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <div className="mode-switch" aria-label="Режим авторизации">
              <button
                className={authMode === 'login' ? 'is-active' : ''}
                type="button"
                onClick={() => setAuthMode('login')}
              >
                Вход
              </button>
              <button
                className={authMode === 'register' ? 'is-active' : ''}
                type="button"
                onClick={() => setAuthMode('register')}
              >
                Регистрация
              </button>
            </div>

            <Field label="Почта">
              <input
                autoComplete="email"
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
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
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
            <button className="primary-action" type="submit">
              {authMode === 'login' ? 'Войти' : 'Создать аккаунт'}
            </button>
            {message && <span className="status">{message}</span>}
          </form>
        </section>

        <aside className="auth-side">
          <h2>Доступы для проверки</h2>
          <button
            type="button"
            onClick={() => {
              setAuthMode('login')
              setAuthForm((current) => ({
                ...current,
                email: 'admin@warehouse.local',
                password: 'Admin123!',
              }))
            }}
          >
            Администратор
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('login')
              setAuthForm((current) => ({
                ...current,
                email: 'employee@warehouse.local',
                password: 'Warehouse123!',
              }))
            }}
          >
            Сотрудник
          </button>
          {authMode === 'register' && (
            <div className="invite-list">
              {INVITATION_CODES.map((code) => (
                <button key={code} type="button" onClick={() => setAuthFormValue('invitationCode', code)}>
                  {code}
                </button>
              ))}
            </div>
          )}
        </aside>
      </main>
    )
  }

  return (
    <main className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <span>СУ</span>
          <div>
            <strong>Склад</strong>
            <small>учет материалов</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Разделы">
          <NavButton active={activeView === 'overview'} onClick={() => setActiveView('overview')}>
            Обзор
          </NavButton>
          <NavButton active={activeView === 'receipt'} onClick={() => setActiveView('receipt')}>
            Приход
          </NavButton>
          <NavButton active={activeView === 'shipment'} onClick={() => setActiveView('shipment')}>
            Расход
          </NavButton>
          <NavButton active={activeView === 'directories'} onClick={() => setActiveView('directories')}>
            Справочники
          </NavButton>
          <NavButton active={activeView === 'reports'} onClick={() => setActiveView('reports')}>
            Отчеты
          </NavButton>
          {isAdmin && (
            <NavButton active={activeView === 'admin'} onClick={() => setActiveView('admin')}>
              Админ
            </NavButton>
          )}
        </nav>

        <div className="user-box">
          <strong>{currentUser?.name ?? 'Пользователь'}</strong>
          <span>{currentUser?.email}</span>
          <b>{formatRole(currentUser?.role)}</b>
        </div>
      </aside>

      <section className="content-shell">
        <header className="topbar">
          <div>
            <h1>{getViewTitle(activeView)}</h1>
            <p>{getViewSubtitle(activeView)}</p>
          </div>
          <div className="topbar-actions">
            {message && <span className="status">{message}</span>}
            <button
              className="ghost-button"
              type="button"
              aria-pressed={isDarkTheme}
              onClick={() => setIsDarkTheme((current) => !current)}
            >
              {isDarkTheme ? 'Светлая тема' : 'Темная тема'}
            </button>
            <button type="button" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        </header>

        {activeView === 'overview' && (
          <section className="view-stack">
            <section className="metrics" aria-label="Показатели склада">
              <Metric label="Приходов" value={storageUnits.length} />
              <Metric label="Расходов" value={shipments.length} />
              <Metric label="Доступный остаток" value={formatQuantity(totalAvailableQuantity)} />
              <Metric label="Сумма прихода" value={formatMoney(totalReceivedAmount)} />
            </section>

            <section className="task-grid">
              <TaskCard
                title="Оформить приход"
                text="Добавьте ордер, поставщика, материал и цену."
                action="Перейти"
                onClick={() => setActiveView('receipt')}
              />
              <TaskCard
                title="Списать со склада"
                text="Отправьте материал на участок, клиенту или в подразделение."
                action="Расход"
                onClick={() => setActiveView('shipment')}
              />
              <TaskCard
                title="Проверить остатки"
                text="Сравните приход, расход и доступное количество."
                action="Остатки"
                onClick={() => setActiveView('shipment')}
              />
              {isAdmin && (
                <TaskCard
                  title="Управлять доступом"
                  text="Создайте сотрудника или администратора."
                  action="Админ"
                  onClick={() => setActiveView('admin')}
                />
              )}
            </section>

            <section className="workspace">
              <section className="panel">
                <PanelHeading title="Последние приходы" text="Самые свежие поступления">
                  {storageUnits.length > TABLE_PREVIEW_LIMIT && (
                    <button className="ghost-button" type="button" onClick={() => setActiveView('receipt')}>
                      Все
                    </button>
                  )}
                </PanelHeading>
                <StorageTable rows={latestStorageUnits} compact />
              </section>
              <section className="panel">
                <PanelHeading title="Последние расходы" text="Материалы, которые ушли со склада">
                  {shipments.length > TABLE_PREVIEW_LIMIT && (
                    <button className="ghost-button" type="button" onClick={() => setActiveView('shipment')}>
                      Все
                    </button>
                  )}
                </PanelHeading>
                <ShipmentTable rows={latestShipments} compact />
              </section>
            </section>
          </section>
        )}

        {activeView === 'receipt' && (
          <section className="workspace">
            <form className="panel form-panel" onSubmit={handleReceiptSubmit}>
              <PanelHeading title="Новый приход" text="Заполните реквизиты складского ордера">
                <button type="submit">Добавить</button>
              </PanelHeading>

              <div className="form-grid">
                <Field label="Номер ордера">
                  <input
                    inputMode="numeric"
                    value={receiptForm.orderNumber}
                    onChange={(event) => setReceiptFormValue('orderNumber', event.target.value)}
                  />
                </Field>
                <Field label="Дата">
                  <input
                    type="date"
                    value={receiptForm.orderDate}
                    onChange={(event) => setReceiptFormValue('orderDate', event.target.value)}
                  />
                </Field>
                <Field label="Поставщик">
                  <select
                    value={receiptForm.supplierCode}
                    onChange={(event) => setReceiptFormValue('supplierCode', event.target.value)}
                  >
                    {suppliers.map((supplier) => (
                      <option key={supplier.code} value={supplier.code}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Балансовый счет">
                  <input
                    value={receiptForm.balanceAccount}
                    onChange={(event) => setReceiptFormValue('balanceAccount', event.target.value)}
                  />
                </Field>
                <Field label="Документ">
                  <select
                    value={receiptForm.documentTypeCode}
                    onChange={(event) => setReceiptFormValue('documentTypeCode', event.target.value)}
                  >
                    {documents.map((document) => (
                      <option key={document.code} value={document.code}>
                        {document.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Номер документа">
                  <input
                    value={receiptForm.documentNumber}
                    onChange={(event) => setReceiptFormValue('documentNumber', event.target.value)}
                  />
                </Field>
                <Field label="Материал">
                  <select
                    value={receiptForm.materialCode}
                    onChange={(event) => setReceiptFormValue('materialCode', event.target.value)}
                  >
                    {materials.map((material) => (
                      <option key={material.code} value={material.code}>
                        {material.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Счет материала">
                  <input
                    value={receiptForm.materialAccount}
                    onChange={(event) => setReceiptFormValue('materialAccount', event.target.value)}
                  />
                </Field>
                <Field label="Единица измерения">
                  <select
                    value={receiptForm.unitCode}
                    onChange={(event) => setReceiptFormValue('unitCode', event.target.value)}
                  >
                    {receiptUnitsForMaterial.map((unit) => (
                      <option key={unit.unitCode} value={unit.unitCode}>
                        {unit.unitName}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Количество">
                  <input
                    inputMode="decimal"
                    value={receiptForm.quantity}
                    onChange={(event) => setReceiptFormValue('quantity', event.target.value)}
                  />
                </Field>
                <Field label="Цена">
                  <input
                    inputMode="decimal"
                    value={receiptForm.unitPrice}
                    onChange={(event) => setReceiptFormValue('unitPrice', event.target.value)}
                  />
                </Field>
              </div>
            </form>

            <section className="panel">
              <PanelHeading title="Журнал прихода" text="Поиск по ордеру, поставщику, материалу или сумме" />
              <div className="toolbar">
                <input
                  placeholder="Найти приход"
                  value={storageSearch}
                  onChange={(event) => setStorageSearch(event.target.value)}
                />
                <TableToggleButton
                  expanded={isReceiptJournalOpen}
                  total={filteredStorageUnits.length}
                  onToggle={() => setIsReceiptJournalOpen((current) => !current)}
                />
              </div>
              <StorageTable rows={visibleStorageUnits} />
            </section>
          </section>
        )}

        {activeView === 'shipment' && (
          <section className="view-stack">
            <section className="workspace">
              <form className="panel form-panel" onSubmit={handleShipmentSubmit}>
                <PanelHeading
                  title="Новый расход"
                  text={`Доступно по выбранной позиции: ${formatQuantity(currentShipmentBalance?.availableQuantity ?? 0)}`}
                >
                  <button type="submit">Отправить</button>
                </PanelHeading>

                <div className="form-grid">
                  <Field label="Номер расхода">
                    <input
                      inputMode="numeric"
                      value={shipmentForm.shipmentNumber}
                      onChange={(event) => setShipmentFormValue('shipmentNumber', event.target.value)}
                    />
                  </Field>
                  <Field label="Дата">
                    <input
                      type="date"
                      value={shipmentForm.shipmentDate}
                      onChange={(event) => setShipmentFormValue('shipmentDate', event.target.value)}
                    />
                  </Field>
                  <Field label="Куда отправить">
                    <input
                      value={shipmentForm.destination}
                      onChange={(event) => setShipmentFormValue('destination', event.target.value)}
                    />
                  </Field>
                  <Field label="Номер документа">
                    <input
                      value={shipmentForm.documentNumber}
                      onChange={(event) => setShipmentFormValue('documentNumber', event.target.value)}
                    />
                  </Field>
                  <Field label="Материал">
                    <select
                      value={shipmentForm.materialCode}
                      onChange={(event) => setShipmentFormValue('materialCode', event.target.value)}
                    >
                      {materials.map((material) => (
                        <option key={material.code} value={material.code}>
                          {material.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Единица измерения">
                    <select
                      value={shipmentForm.unitCode}
                      onChange={(event) => setShipmentFormValue('unitCode', event.target.value)}
                    >
                      {shipmentUnitsForMaterial.map((unit) => (
                        <option key={unit.unitCode} value={unit.unitCode}>
                          {unit.unitName}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Количество">
                    <input
                      inputMode="decimal"
                      value={shipmentForm.quantity}
                      onChange={(event) => setShipmentFormValue('quantity', event.target.value)}
                    />
                  </Field>
                  <Field label="Комментарий">
                    <input
                      value={shipmentForm.comment}
                      onChange={(event) => setShipmentFormValue('comment', event.target.value)}
                    />
                  </Field>
                </div>
              </form>

              <section className="panel">
                <PanelHeading title="Остатки" text="Приход минус расход по каждой единице измерения">
                  <TableToggleButton
                    expanded={isStockBalancesOpen}
                    total={stockBalances.length}
                    onToggle={() => setIsStockBalancesOpen((current) => !current)}
                  />
                </PanelHeading>
                <StockTable rows={visibleStockBalances} />
              </section>
            </section>

            <section className="panel">
              <PanelHeading title="Журнал расхода" text="Все отправки материалов со склада" />
              <div className="toolbar">
                <input
                  placeholder="Найти расход"
                  value={shipmentSearch}
                  onChange={(event) => setShipmentSearch(event.target.value)}
                />
                <TableToggleButton
                  expanded={isShipmentJournalOpen}
                  total={filteredShipments.length}
                  onToggle={() => setIsShipmentJournalOpen((current) => !current)}
                />
              </div>
              <ShipmentTable rows={visibleShipments} />
            </section>
          </section>
        )}

        {activeView === 'directories' && (
          <section className="view-stack">
            <section className="panel">
              <PanelHeading title="Материалы" text="Коды, классы, группы и счета" />
              <div className="toolbar">
                <input
                  placeholder="Название, код, класс, группа или счет"
                  value={materialSearch}
                  onChange={(event) => setMaterialSearch(event.target.value)}
                />
              </div>
              <MaterialsTable rows={filteredMaterials} />
            </section>

            <section className="directory-grid">
              <section className="panel">
                <PanelHeading title="Поставщики" text="Юридические и банковские реквизиты" />
                <div className="supplier-list">
                  {suppliers.map((supplier) => (
                    <article className="supplier-card" key={supplier.code}>
                      <strong>{supplier.name}</strong>
                      <span>ИНН {supplier.inn}</span>
                      <span>Юр. адрес: {formatAddress(supplier.legalAddress)}</span>
                      <span>Банк: {formatAddress(supplier.bankAddress)}</span>
                      <b>Счет {supplier.bankAccountNumber}</b>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel">
                <PanelHeading title="Последние материалы" text="Быстрый просмотр справочника" />
                <div className="material-list">
                  {latestMaterials.map((material) => (
                    <article className="material-card" key={material.code}>
                      <strong>{material.name}</strong>
                      <span>{material.code}</span>
                      <span>Класс {material.classCode}, группа {material.groupCode}</span>
                      <b>Счет {material.materialAccount}</b>
                    </article>
                  ))}
                </div>
              </section>
            </section>
          </section>
        )}

        {activeView === 'reports' && (
          <section className="reports">
            <section className="panel">
              <PanelHeading
                title="Поставщики материала"
                text={`${supplierCount} поставщика для: ${selectedMaterialName}`}
              >
                <div className="report-actions">
                  <select value={selectedMaterial} onChange={(event) => setSelectedMaterial(event.target.value)}>
                    {materials.map((material) => (
                      <option key={material.code} value={material.code}>
                        {material.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setIsSupplierReportOpen((current) => !current)}>
                    {isSupplierReportOpen ? 'Свернуть' : 'Показать все'}
                  </button>
                </div>
              </PanelHeading>
              <div className="supplier-list">
                {visibleSupplierReport.map((supplier) => (
                  <article className="supplier-card" key={supplier.supplierCode}>
                    <strong>{supplier.supplierName}</strong>
                    <span>ИНН {supplier.inn}</span>
                    <span>{formatAddress(supplier.legalAddress)}</span>
                    <span>Банк: {formatAddress(supplier.bankAddress)}</span>
                    <b>{formatMoney(supplier.totalAmount)}</b>
                  </article>
                ))}
              </div>
            </section>

            <form className="panel" onSubmit={handleBankSubmit}>
              <PanelHeading
                title="Поставщики по банку"
                text={bankCount === null ? 'Введите адрес банка' : `Найдено: ${bankCount}`}
              >
                <button type="submit">Посчитать</button>
              </PanelHeading>
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
        )}

        {activeView === 'admin' && isAdmin && (
          <section className="admin-layout">
            <form className="panel" onSubmit={handleAdminCreateUser}>
              <PanelHeading title="Новый пользователь" text="Создайте доступ для сотрудника или администратора">
                <button type="submit">Создать</button>
              </PanelHeading>
              <div className="form-grid compact">
                <Field label="Имя">
                  <input
                    value={adminUserForm.name}
                    onChange={(event) => setAdminUserFormValue('name', event.target.value)}
                    required
                  />
                </Field>
                <Field label="Почта">
                  <input
                    type="email"
                    value={adminUserForm.email}
                    onChange={(event) => setAdminUserFormValue('email', event.target.value)}
                    required
                  />
                </Field>
                <Field label="Пароль">
                  <input
                    type="password"
                    value={adminUserForm.password}
                    onChange={(event) => setAdminUserFormValue('password', event.target.value)}
                    required
                  />
                </Field>
                <Field label="Роль">
                  <select
                    value={adminUserForm.role}
                    onChange={(event) => setAdminUserFormValue('role', event.target.value as AdminUserForm['role'])}
                  >
                    <option value="employee">Сотрудник</option>
                    <option value="admin">Администратор</option>
                  </select>
                </Field>
              </div>
            </form>

            <section className="panel">
              <PanelHeading title="Коды пользователей" text="Коды для регистрации новых сотрудников" />
              <div className="code-list">
                {adminInvitationCodes.map((code) => (
                  <span className="code-chip" key={code}>
                    {code}
                  </span>
                ))}
              </div>
            </section>

            <section className="panel admin-wide">
              <PanelHeading title="Управление приходами" text="Удаление отдельных ордеров или полная очистка прихода">
                <button
                  className="danger-button"
                  type="button"
                  onClick={handleClearStorageUnits}
                  disabled={storageUnits.length === 0}
                >
                  Очистить приходы
                </button>
              </PanelHeading>
              <AdminStorageTable rows={visibleAdminStorageUnits} onDelete={handleDeleteStorageUnit} />
              <TableFooterToggle
                expanded={isAdminReceiptsOpen}
                total={storageUnits.length}
                onToggle={() => setIsAdminReceiptsOpen((current) => !current)}
              />
            </section>

            <section className="panel admin-wide">
              <PanelHeading title="Управление расходами" text="Удаление отдельных расходов или полная очистка расхода">
                <button
                  className="danger-button"
                  type="button"
                  onClick={handleClearShipments}
                  disabled={shipments.length === 0}
                >
                  Очистить расходы
                </button>
              </PanelHeading>
              <AdminShipmentTable rows={visibleAdminShipments} onDelete={handleDeleteShipment} />
              <TableFooterToggle
                expanded={isAdminShipmentsOpen}
                total={shipments.length}
                onToggle={() => setIsAdminShipmentsOpen((current) => !current)}
              />
            </section>

            <section className="panel admin-wide">
              <PanelHeading title="Пользователи" text="Аккаунты, которые могут войти в систему" />
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Имя</th>
                      <th>Почта</th>
                      <th>Роль</th>
                      <th>Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((user) => (
                      <tr key={user.email}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className="role-pill">{formatRole(user.role)}</span>
                        </td>
                        <td>
                          {user.role === 'employee' ? (
                            <button className="danger-button" type="button" onClick={() => handleDeleteEmployee(user.email)}>
                              Удалить
                            </button>
                          ) : (
                            <span className="muted-cell">Администратор</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}
      </section>
    </main>
  )

  function setReceiptFormValue(field: keyof StorageUnitForm, value: string) {
    setReceiptForm((current) => ({ ...current, [field]: value }))
  }

  function setShipmentFormValue(field: keyof ShipmentForm, value: string) {
    setShipmentForm((current) => ({ ...current, [field]: value }))
  }

  function setBankAddressValue(field: keyof Address, value: string) {
    setBankAddress((current) => ({ ...current, [field]: value }))
  }

  function setAuthFormValue(field: keyof AuthForm, value: string) {
    setAuthForm((current) => ({ ...current, [field]: value }))
  }

  function setAdminUserFormValue(field: keyof AdminUserForm, value: string) {
    setAdminUserForm((current) => ({ ...current, [field]: value }))
  }
}

function NavButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button className={active ? 'is-active' : ''} type="button" onClick={onClick}>
      {children}
    </button>
  )
}

function PanelHeading({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        {text && <p>{text}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function Metric({ label, value }: { label: string | number; value: string | number }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function TaskCard({
  title,
  text,
  action,
  onClick,
}: {
  title: string
  text: string
  action: string
  onClick: () => void
}) {
  return (
    <article className="task-card">
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      <button type="button" onClick={onClick}>
        {action}
      </button>
    </article>
  )
}

function TableToggleButton({
  expanded,
  total,
  onToggle,
}: {
  expanded: boolean
  total: number
  onToggle: () => void
}) {
  if (total <= TABLE_PREVIEW_LIMIT) {
    return null
  }

  return (
    <button className="ghost-button table-toggle" type="button" onClick={onToggle}>
      {expanded ? 'Свернуть' : `Все ${total}`}
    </button>
  )
}

function TableFooterToggle({
  expanded,
  total,
  onToggle,
}: {
  expanded: boolean
  total: number
  onToggle: () => void
}) {
  if (total <= TABLE_PREVIEW_LIMIT) {
    return null
  }

  return (
    <div className="table-footer">
      <button className="ghost-button table-toggle" type="button" onClick={onToggle}>
        {expanded ? 'Свернуть' : `Все ${total}`}
      </button>
    </div>
  )
}

function MaterialsTable({ rows }: { rows: Material[] }) {
  return (
    <div className="table-wrap">
      <table>
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
          {rows.map((material) => (
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
  )
}

function AdminStorageTable({
  rows,
  onDelete,
}: {
  rows: StorageUnit[]
  onDelete: (orderNumber: number) => void
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ордер</th>
            <th>Дата</th>
            <th>Поставщик</th>
            <th>Материал</th>
            <th>Сумма</th>
            <th>Действие</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((unit) => (
            <tr key={unit.orderNumber}>
              <td>{unit.orderNumber}</td>
              <td>{formatDate(unit.orderDate)}</td>
              <td>{unit.supplierName}</td>
              <td>{unit.materialName}</td>
              <td>{formatMoney(unit.totalPrice)}</td>
              <td>
                <button className="danger-button" type="button" onClick={() => onDelete(unit.orderNumber)}>
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AdminShipmentTable({
  rows,
  onDelete,
}: {
  rows: Shipment[]
  onDelete: (shipmentNumber: number) => void
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Расход</th>
            <th>Дата</th>
            <th>Куда</th>
            <th>Материал</th>
            <th>Кол-во</th>
            <th>Действие</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((shipment) => (
            <tr key={shipment.shipmentNumber}>
              <td>{shipment.shipmentNumber}</td>
              <td>{formatDate(shipment.shipmentDate)}</td>
              <td>{shipment.destination}</td>
              <td>{shipment.materialName}</td>
              <td>
                {formatQuantity(shipment.quantity)} {shipment.unitName}
              </td>
              <td>
                <button className="danger-button" type="button" onClick={() => onDelete(shipment.shipmentNumber)}>
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StorageTable({ rows, compact = false }: { rows: StorageUnit[]; compact?: boolean }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ордер</th>
            <th>Дата</th>
            <th>Поставщик</th>
            <th>Материал</th>
            {!compact && <th>Документ</th>}
            <th>Кол-во</th>
            {!compact && <th>Цена</th>}
            <th>Сумма</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((unit) => (
            <tr key={unit.orderNumber}>
              <td>{unit.orderNumber}</td>
              <td>{formatDate(unit.orderDate)}</td>
              <td>{unit.supplierName}</td>
              <td>{unit.materialName}</td>
              {!compact && <td>{unit.documentNumber}</td>}
              <td>
                {formatQuantity(unit.quantity)} {unit.unitName}
              </td>
              {!compact && <td>{formatMoney(unit.unitPrice)}</td>}
              <td>{formatMoney(unit.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ShipmentTable({ rows, compact = false }: { rows: Shipment[]; compact?: boolean }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Расход</th>
            <th>Дата</th>
            <th>Куда</th>
            <th>Материал</th>
            {!compact && <th>Документ</th>}
            <th>Кол-во</th>
            {!compact && <th>Комментарий</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((shipment) => (
            <tr key={shipment.shipmentNumber}>
              <td>{shipment.shipmentNumber}</td>
              <td>{formatDate(shipment.shipmentDate)}</td>
              <td>{shipment.destination}</td>
              <td>{shipment.materialName}</td>
              {!compact && <td>{shipment.documentNumber}</td>}
              <td>
                {formatQuantity(shipment.quantity)} {shipment.unitName}
              </td>
              {!compact && <td>{shipment.comment || '—'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StockTable({ rows }: { rows: StockBalance[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Материал</th>
            <th>Ед.</th>
            <th>Приход</th>
            <th>Расход</th>
            <th>Остаток</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((balance) => (
            <tr key={`${balance.materialCode}-${balance.unitCode}`}>
              <td>{balance.materialName}</td>
              <td>{balance.unitName}</td>
              <td>{formatQuantity(balance.receivedQuantity)}</td>
              <td>{formatQuantity(balance.shippedQuantity)}</td>
              <td>
                <strong>{formatQuantity(balance.availableQuantity)}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

  if (response.status === 204) {
    return undefined as T
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

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

function getViewTitle(view: ViewId) {
  switch (view) {
    case 'receipt':
      return 'Приход на склад'
    case 'shipment':
      return 'Расход со склада'
    case 'directories':
      return 'Справочники'
    case 'reports':
      return 'Отчеты'
    case 'admin':
      return 'Администрирование'
    default:
      return 'Рабочий стол'
  }
}

function getViewSubtitle(view: ViewId) {
  switch (view) {
    case 'receipt':
      return 'Создание ордера и просмотр журнала приходов'
    case 'shipment':
      return 'Отправка материалов и контроль текущих остатков'
    case 'directories':
      return 'Материалы, поставщики и реквизиты'
    case 'reports':
      return 'Аналитика по материалам и банковским адресам'
    case 'admin':
      return 'Пользователи и роли доступа'
    default:
      return 'Главные показатели и быстрые действия'
  }
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

function formatQuantity(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 3,
  }).format(value)
}

function formatRole(role?: string) {
  if (role === 'admin') {
    return 'Администратор'
  }

  return 'Сотрудник'
}

export default App
