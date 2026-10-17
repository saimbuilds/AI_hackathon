// Response helpers shared by the PDF routes (route files may only export HTTP handlers).
export const pdfResponse = (bytes: Buffer, name: string, inline: boolean) =>
  new Response(new Uint8Array(bytes), {
    headers: { 'content-type': 'application/pdf', 'content-length': String(bytes.length), 'content-disposition': `${inline ? 'inline' : 'attachment'}; filename="${name}"`, 'cache-control': 'private, max-age=300' },
  });

export const safeName = (paper: string, date: string) => `${paper.replace(/[^\p{L}\p{N} _-]+/gu, '').trim().replace(/\s+/g, '-') || 'paper'}-${date}.pdf`;
