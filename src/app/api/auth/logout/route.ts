import { NextResponse } from 'next/server';
import { success } from '@/lib/api/respond';

export async function POST() {
  const response = success({ message: 'Logged out' });
  response.cookies.delete('auth');
  return response;
}
