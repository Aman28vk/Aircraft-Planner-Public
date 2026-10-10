export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  return res.end(
    JSON.stringify({
      success: true,
      message: 'Aircraft Lifecycle Management - Standalone Local Demo Mode Active',
    })
  );
}
