import { buildLocalePayload, getI18nReadiness } from '@/lib/i18n';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale') || searchParams.get('lang');
  const sampleDate = searchParams.get('date');
  const sampleAmount = searchParams.get('amount');
  const currency = searchParams.get('currency') || undefined;

  const readiness = getI18nReadiness();
  const selected = buildLocalePayload({
    locale,
    acceptLanguage: request.headers.get('accept-language'),
    sampleDate,
    sampleAmount,
    currency,
  });

  return Response.json({
    ...readiness,
    selected,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
