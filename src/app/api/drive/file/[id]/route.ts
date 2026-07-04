import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { Readable } from 'stream';

export const dynamic = 'force-dynamic';

// Wrap a Node.js Readable in a web ReadableStream with guards so that an
// aborted/cancelled request (normal for media streaming) never throws
// "Controller is already closed".
function nodeStreamToWebStream(nodeStream: Readable): ReadableStream {
  let closed = false;
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer) => {
        if (closed) return;
        try {
          controller.enqueue(new Uint8Array(chunk));
        } catch {
          closed = true;
          nodeStream.destroy();
        }
      });
      nodeStream.on('end', () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed by the client - ignore
        }
      });
      nodeStream.on('error', (err) => {
        if (closed) return;
        closed = true;
        try {
          controller.error(err);
        } catch {
          // already closed by the client - ignore
        }
      });
    },
    cancel() {
      closed = true;
      nodeStream.destroy();
    },
  });
}

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = params.id;
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!serviceAccountEmail || !privateKey) {
      return NextResponse.json(
        { error: 'Missing Google credentials' },
        { status: 500 }
      );
    }

    const auth = new google.auth.JWT(
      serviceAccountEmail,
      undefined,
      privateKey.replace(/\\n/g, '\n'),
      SCOPES
    );

    const drive = google.drive({ version: 'v3', auth });

    const rangeHeader = request.headers.get('range');

    // Forward the browser's Range header to Google Drive and stream the bytes
    // straight through, so playback starts immediately without buffering the
    // whole file in memory first.
    const requestOptions: {
      responseType: 'stream';
      headers?: Record<string, string>;
    } = { responseType: 'stream' };

    if (rangeHeader) {
      requestOptions.headers = { Range: rangeHeader };
    }

    const response = await drive.files.get(
      { fileId, alt: 'media' },
      requestOptions
    );

    const nodeStream = response.data as unknown as Readable;

    // If the client aborts (e.g. skipping tracks), stop pulling from Drive.
    request.signal.addEventListener('abort', () => {
      nodeStream.destroy();
    });

    const webStream = nodeStreamToWebStream(nodeStream);

    // Pass through the relevant headers Google Drive returned (content length,
    // content range, content type) so the browser can stream and seek.
    const driveHeaders = response.headers as Record<string, string>;
    const headers = new Headers();
    headers.set('Content-Type', driveHeaders['content-type'] || 'audio/mpeg');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=31536000');

    if (driveHeaders['content-length']) {
      headers.set('Content-Length', driveHeaders['content-length']);
    }
    if (driveHeaders['content-range']) {
      headers.set('Content-Range', driveHeaders['content-range']);
    }

    const status = rangeHeader ? 206 : 200;
    return new NextResponse(webStream, { status, headers });
  } catch (error) {
    console.error('Error streaming file:', error);
    return NextResponse.json(
      { error: 'Failed to stream file from Google Drive' },
      { status: 500 }
    );
  }
}
