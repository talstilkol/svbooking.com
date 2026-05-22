import { verifyCronAuth } from '@/lib/agent-utils';
import { buildOpsAlerts } from '@/lib/ops-alerts';
import { deliverOpsAlertReport, isOpsAlertDeliveryConfigured } from '@/lib/ops-alert-delivery';
import { appendOpsAlertDeliveryEvent } from '@/lib/ops-alert-events';
import { hashId } from '@/lib/utils/hashId';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const report = await buildOpsAlerts();
    const deliverable = report.alerts.filter((alert) => alert.severity === 'critical' || alert.severity === 'warning');
    let delivery = {
      configured: isOpsAlertDeliveryConfigured(),
      status: deliverable.length > 0 ? 'not-configured' : 'skipped-no-actionable-alerts',
    };

    if (deliverable.length > 0) {
      delivery = await deliverOpsAlertReport({
        ...report,
        alerts: deliverable,
        summary: {
          total: deliverable.length,
          critical: deliverable.filter((alert) => alert.severity === 'critical').length,
          warning: deliverable.filter((alert) => alert.severity === 'warning').length,
          info: 0,
        },
      });
    }

    const event = {
      id: hashId('ops-alert-delivery', report.checkedAt, report.status, delivery.status),
      at: new Date().toISOString(),
      reportStatus: report.status,
      alertCount: report.summary.total,
      actionableAlertCount: deliverable.length,
      critical: report.summary.critical,
      warning: report.summary.warning,
      deliveryConfigured: delivery.configured,
      deliveryStatus: delivery.status,
      deliveryHttpStatus: delivery.httpStatus || null,
    };
    const storedEvent = await appendOpsAlertDeliveryEvent(event);

    return Response.json({
      status: 'completed',
      delivery,
      event: storedEvent,
      report,
    }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('GET /api/ops/alerts/evaluate error:', err);
    return Response.json(
      { status: 'error', error: 'Ops alert evaluation unavailable' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
