import { prisma } from './prisma'

export async function getConfig(clave: string): Promise<string | null> {
  const row = await prisma.configuracion.findUnique({ where: { clave } })
  return row?.valor ?? null
}

export async function setConfig(clave: string, valor: string): Promise<void> {
  await prisma.configuracion.upsert({
    where: { clave },
    update: { valor },
    create: { clave, valor },
  })
}

export async function getAmazonConfig(): Promise<{
  appId: string | null
  clientId: string | null
  clientSecret: string | null
  redirectUri: string | null
  isConfigured: boolean
}> {
  const [appId, clientId, clientSecret, redirectUri] = await Promise.all([
    getConfig('amazon_app_id'),
    getConfig('amazon_lwa_client_id'),
    getConfig('amazon_lwa_client_secret'),
    getConfig('amazon_redirect_uri'),
  ])
  return {
    appId,
    clientId,
    clientSecret,
    redirectUri,
    isConfigured: !!(appId && clientId && clientSecret && redirectUri),
  }
}

export async function getTikTokConfig(): Promise<{
  appKey: string | null
  appSecret: string | null
  redirectUri: string | null
  serviceId: string | null
  isConfigured: boolean
}> {
  const [appKey, appSecret, redirectUri, serviceId] = await Promise.all([
    getConfig('tiktok_app_key'),
    getConfig('tiktok_app_secret'),
    getConfig('tiktok_redirect_uri'),
    getConfig('tiktok_service_id'),
  ])
  return {
    appKey,
    appSecret,
    redirectUri,
    // El Service ID es el que va en la URL de autorización; si no se indica, se usa el App Key
    serviceId: serviceId || appKey,
    isConfigured: !!(appKey && appSecret && redirectUri),
  }
}
