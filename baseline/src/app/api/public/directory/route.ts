import { NextRequest, NextResponse } from 'next/server';
import { getPublicDirectoryResponse, publicDirectoryStore } from '../../../../server/public-directory/public-directory-service.mjs';

export const revalidate = 60;

export function GET(request: NextRequest) {
  const url = new URL(request.url);
  const result = getPublicDirectoryResponse({
    store: publicDirectoryStore,
    clientKey: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous',
    query: url.searchParams.get('q') ?? '',
    organizationType: url.searchParams.get('type') ?? '',
    page: url.searchParams.get('page') ?? '1',
    pageSize: url.searchParams.get('pageSize') ?? '20',
    asOf: url.searchParams.get('asOf') ?? new Date().toISOString(),
  });
  return NextResponse.json(result.body, { status: result.status, headers: result.headers });
}
