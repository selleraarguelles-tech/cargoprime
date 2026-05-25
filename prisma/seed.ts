import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'

const dbPath = path.join(process.cwd(), 'dev.db')
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // Usuarios del sistema
  const adminPassword = await bcrypt.hash('admin123', 10)
  const readonlyPassword = await bcrypt.hash('almacen123', 10)

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      nombre: 'Administrador',
      email: 'admin@almacen-fbm.local',
      password: adminPassword,
      rol: 'admin',
    },
  })
  await prisma.user.upsert({
    where: { username: 'operario1' },
    update: {},
    create: {
      username: 'operario1',
      nombre: 'Carlos Operario',
      email: 'operario1@almacen-fbm.local',
      password: readonlyPassword,
      rol: 'readonly',
    },
  })
  await prisma.user.upsert({
    where: { username: 'operario2' },
    update: {},
    create: {
      username: 'operario2',
      nombre: 'María Almacén',
      email: 'operario2@almacen-fbm.local',
      password: readonlyPassword,
      rol: 'readonly',
    },
  })
  console.log('✅ 3 usuarios creados (admin + 2 operarios)')

  // Clientes
  const clientes = await Promise.all([
    prisma.cliente.upsert({
      where: { email: 'info@techgadgets.es' },
      update: {},
      create: { nombre: 'TechGadgets España', email: 'info@techgadgets.es', telefono: '+34 912 345 678' },
    }),
    prisma.cliente.upsert({
      where: { email: 'ventas@casaydeco.com' },
      update: {},
      create: { nombre: 'Casa y Deco SL', email: 'ventas@casaydeco.com', telefono: '+34 934 567 890' },
    }),
    prisma.cliente.upsert({
      where: { email: 'pedidos@sportmax.es' },
      update: {},
      create: { nombre: 'SportMax Online', email: 'pedidos@sportmax.es', telefono: '+34 917 890 123' },
    }),
    prisma.cliente.upsert({
      where: { email: 'almacen@libreriapapel.com' },
      update: {},
      create: { nombre: 'Librería El Papel', email: 'almacen@libreriapapel.com', telefono: '+34 960 234 567' },
    }),
    prisma.cliente.upsert({
      where: { email: 'logistica@beautybrand.es' },
      update: {},
      create: { nombre: 'BeautyBrand ES', email: 'logistica@beautybrand.es', telefono: '+34 935 678 901' },
    }),
  ])

  const [tech, casa, sport, libro, beauty] = clientes
  console.log(`✅ ${clientes.length} clientes creados`)

  // Productos
  const productoData = [
    // TechGadgets
    { sku: 'TG-AURIC-001', nombre: 'Auriculares Bluetooth Pro', clienteId: tech.id, stockActual: 45, stockMinimo: 10 },
    { sku: 'TG-CABLE-002', nombre: 'Cable USB-C 2m Nylon', clienteId: tech.id, stockActual: 3, stockMinimo: 15 },
    { sku: 'TG-POWER-003', nombre: 'PowerBank 20000mAh', clienteId: tech.id, stockActual: 0, stockMinimo: 8 },
    { sku: 'TG-SOPMV-004', nombre: 'Soporte Móvil Coche', clienteId: tech.id, stockActual: 22, stockMinimo: 10 },
    // Casa y Deco
    { sku: 'CD-JARRON-001', nombre: 'Jarrón Cerámica Nórdico', clienteId: casa.id, stockActual: 18, stockMinimo: 5 },
    { sku: 'CD-COJIN-002', nombre: 'Cojín Terciopelo 45x45', clienteId: casa.id, stockActual: 2, stockMinimo: 8 },
    { sku: 'CD-VELAS-003', nombre: 'Set 3 Velas Aromáticas', clienteId: casa.id, stockActual: 35, stockMinimo: 10 },
    { sku: 'CD-MARCO-004', nombre: 'Marco Fotos Madera 20x30', clienteId: casa.id, stockActual: 12, stockMinimo: 5 },
    // SportMax
    { sku: 'SM-MOCHI-001', nombre: 'Mochila Hiking 35L', clienteId: sport.id, stockActual: 8, stockMinimo: 5 },
    { sku: 'SM-GUANT-002', nombre: 'Guantes Running Invierno', clienteId: sport.id, stockActual: 0, stockMinimo: 10 },
    { sku: 'SM-BOTEL-003', nombre: 'Botella Térmica 750ml', clienteId: sport.id, stockActual: 30, stockMinimo: 15 },
    { sku: 'SM-BANDA-004', nombre: 'Banda Resistencia Pack 5', clienteId: sport.id, stockActual: 4, stockMinimo: 8 },
    // Librería
    { sku: 'LP-LIBRO-001', nombre: 'Pack Libros Bestsellers 2024', clienteId: libro.id, stockActual: 25, stockMinimo: 10 },
    { sku: 'LP-AGEN-002', nombre: 'Agenda 2025 Premium', clienteId: libro.id, stockActual: 60, stockMinimo: 20 },
    { sku: 'LP-LAPIZ-003', nombre: 'Set Lápices Acuarela 48u', clienteId: libro.id, stockActual: 7, stockMinimo: 10 },
    // BeautyBrand
    { sku: 'BB-SERUM-001', nombre: 'Sérum Vitamina C 30ml', clienteId: beauty.id, stockActual: 15, stockMinimo: 8 },
    { sku: 'BB-CREMA-002', nombre: 'Crema Hidratante SPF50', clienteId: beauty.id, stockActual: 1, stockMinimo: 10 },
    { sku: 'BB-MASCA-003', nombre: 'Mascarilla Oro 24K Pack 5', clienteId: beauty.id, stockActual: 28, stockMinimo: 10 },
    { sku: 'BB-ACEITE-004', nombre: 'Aceite Jojoba 100ml Bio', clienteId: beauty.id, stockActual: 0, stockMinimo: 5 },
    { sku: 'BB-TONER-005', nombre: 'Tóner Ácido Hialurónico', clienteId: beauty.id, stockActual: 9, stockMinimo: 10 },
  ]

  const productos: Record<string, number> = {}
  for (const p of productoData) {
    const prod = await prisma.producto.upsert({
      where: { sku: p.sku },
      update: { stockActual: p.stockActual },
      create: p,
    })
    productos[p.sku] = prod.id
  }
  console.log(`✅ ${productoData.length} productos creados`)

  // Pedidos
  const estados = ['sin_etiqueta', 'sin_etiqueta', 'preparando', 'enviado']
  const transportistas = ['Correos', 'GLS', 'SEUR', 'MRW', 'DHL']
  const ciudades = [
    { ciudad: 'Madrid', cp: '28001' },
    { ciudad: 'Barcelona', cp: '08001' },
    { ciudad: 'Valencia', cp: '46001' },
    { ciudad: 'Sevilla', cp: '41001' },
    { ciudad: 'Zaragoza', cp: '50001' },
    { ciudad: 'Bilbao', cp: '48001' },
    { ciudad: 'Málaga', cp: '29001' },
    { ciudad: 'Murcia', cp: '30001' },
  ]
  const nombres = [
    'Ana García López', 'Carlos Martínez Ruiz', 'María Fernández Pérez',
    'José Rodríguez Sánchez', 'Laura González Díaz', 'Miguel López Jiménez',
    'Sara Torres Moreno', 'Pablo Flores Castro', 'Elena Romero Vega',
    'David Sanz Rubio',
  ]
  const pedidosData = [
    { amazonOrderId: '303-1234567-8901234', skuProd: 'TG-AURIC-001', clienteId: tech.id },
    { amazonOrderId: '303-2345678-9012345', skuProd: 'TG-CABLE-002', clienteId: tech.id },
    { amazonOrderId: '303-3456789-0123456', skuProd: 'TG-POWER-003', clienteId: tech.id },
    { amazonOrderId: '303-4567890-1234567', skuProd: 'TG-SOPMV-004', clienteId: tech.id },
    { amazonOrderId: '303-5678901-2345678', skuProd: 'CD-JARRON-001', clienteId: casa.id },
    { amazonOrderId: '303-6789012-3456789', skuProd: 'CD-COJIN-002', clienteId: casa.id },
    { amazonOrderId: '303-7890123-4567890', skuProd: 'CD-VELAS-003', clienteId: casa.id },
    { amazonOrderId: '303-8901234-5678901', skuProd: 'SM-MOCHI-001', clienteId: sport.id },
    { amazonOrderId: '303-9012345-6789012', skuProd: 'SM-GUANT-002', clienteId: sport.id },
    { amazonOrderId: '303-0123456-7890123', skuProd: 'SM-BOTEL-003', clienteId: sport.id },
    { amazonOrderId: '303-1234568-8901235', skuProd: 'SM-BANDA-004', clienteId: sport.id },
    { amazonOrderId: '303-2345679-9012346', skuProd: 'LP-LIBRO-001', clienteId: libro.id },
    { amazonOrderId: '303-3456780-0123457', skuProd: 'LP-AGEN-002', clienteId: libro.id },
    { amazonOrderId: '303-4567891-1234568', skuProd: 'LP-LAPIZ-003', clienteId: libro.id },
    { amazonOrderId: '303-5678902-2345679', skuProd: 'BB-SERUM-001', clienteId: beauty.id },
    { amazonOrderId: '303-6789013-3456780', skuProd: 'BB-CREMA-002', clienteId: beauty.id },
    { amazonOrderId: '303-7890124-4567891', skuProd: 'BB-MASCA-003', clienteId: beauty.id },
    { amazonOrderId: '303-8901235-5678902', skuProd: 'BB-ACEITE-004', clienteId: beauty.id },
    { amazonOrderId: '303-9012346-6789013', skuProd: 'BB-TONER-005', clienteId: beauty.id },
    { amazonOrderId: '303-0123457-7890124', skuProd: 'TG-AURIC-001', clienteId: tech.id },
    { amazonOrderId: '303-1234569-8901236', skuProd: 'CD-MARCO-004', clienteId: casa.id },
    { amazonOrderId: '303-2345670-9012347', skuProd: 'SM-BOTEL-003', clienteId: sport.id },
    { amazonOrderId: '303-3456781-0123458', skuProd: 'LP-AGEN-002', clienteId: libro.id },
    { amazonOrderId: '303-4567892-1234569', skuProd: 'BB-SERUM-001', clienteId: beauty.id },
    { amazonOrderId: '303-5678903-2345670', skuProd: 'TG-CABLE-002', clienteId: tech.id },
    { amazonOrderId: '303-6789014-3456781', skuProd: 'CD-VELAS-003', clienteId: casa.id },
    { amazonOrderId: '303-7890125-4567892', skuProd: 'SM-MOCHI-001', clienteId: sport.id },
    { amazonOrderId: '303-8901236-5678903', skuProd: 'LP-LIBRO-001', clienteId: libro.id },
    { amazonOrderId: '303-9012347-6789014', skuProd: 'BB-MASCA-003', clienteId: beauty.id },
    { amazonOrderId: '303-0123458-7890125', skuProd: 'TG-SOPMV-004', clienteId: tech.id },
  ]

  let pedidosCreados = 0
  for (let i = 0; i < pedidosData.length; i++) {
    const p = pedidosData[i]
    const loc = ciudades[i % ciudades.length]
    const nombre = nombres[i % nombres.length]
    const estado = estados[i % estados.length]
    const transportista = transportistas[i % transportistas.length]
    const daysAgo = Math.floor(Math.random() * 14)
    const createdAt = new Date()
    createdAt.setDate(createdAt.getDate() - daysAgo)

    try {
      await prisma.pedido.upsert({
        where: { amazonOrderId: p.amazonOrderId },
        update: {},
        create: {
          amazonOrderId: p.amazonOrderId,
          clienteId: p.clienteId,
          productoId: productos[p.skuProd],
          destinatarioNombre: nombre,
          destinatarioDireccion: `Calle ${['Mayor', 'Real', 'Nueva', 'Ancha', 'Larga'][i % 5]} ${i + 1}, ${i % 5 + 1}º${String.fromCharCode(65 + (i % 4))}`,
          destinatarioCP: loc.cp,
          destinatarioCiudad: loc.ciudad,
          destinatarioPais: 'España',
          peso: parseFloat((0.2 + Math.random() * 2).toFixed(2)),
          transportista,
          estado,
          createdAt,
        },
      })
      pedidosCreados++
    } catch {
      // Skip duplicates
    }
  }
  console.log(`✅ ${pedidosCreados} pedidos creados`)
  console.log('🎉 Seed completado!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
