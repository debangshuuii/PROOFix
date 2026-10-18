export async function GET() {
  // Controlled 500 error simulating database connection failure
  return Response.json(
    {
      error: 'Internal Server Error',
      message: 'Database connection failed: ECONNREFUSED 127.0.0.1:5432',
      hint: 'PostgreSQL instance was not reached on the configured port.',
    },
    { status: 500 }
  );
}
