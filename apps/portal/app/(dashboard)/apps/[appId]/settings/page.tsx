import { notFound } from 'next/navigation'
import { getApp } from '../../../../../lib/apps/service'
import { requireUser } from '../../../../../lib/auth/session'
import { can } from '../../../../../lib/permissions'
import { AppSettingsForm } from './app-settings-form'
import { DangerZone } from './danger-zone'
import { LauncherSetting } from './launcher-setting'
import { ReportsSetting } from './reports-setting'
import { readAppSettings } from '../../../../../lib/apps/settings'

export const metadata = { title: 'App settings' }

export default async function AppSettingsPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params
  const user = await requireUser()
  const app = await getApp(
    { userId: user.id, organizationId: user.organizationId, role: user.role },
    appId,
  )
  if (!app) notFound()

  const settings = readAppSettings(app.settings)

  return (
    <section>
      <h1>{app.name} settings</h1>

      <AppSettingsForm
        appId={app.id}
        name={app.name}
        origins={app.origins}
        publicKey={app.publicKey}
        canEdit={can(user.role, 'app:update')}
        canRotate={can(user.role, 'app:rotate-key')}
      />

      <LauncherSetting
        appId={app.id}
        enabled={settings.launcher}
        label={settings.launcherLabel}
        canEdit={can(user.role, 'app:update')}
      />

      <ReportsSetting
        appId={app.id}
        enabled={settings.reports}
        labels={settings.reportLabels}
        retentionDays={settings.reportRetentionDays}
        canEdit={can(user.role, 'app:update')}
      />

      {can(user.role, 'app:delete') ? <DangerZone appId={app.id} name={app.name} /> : null}
    </section>
  )
}
