import { google, drive_v3 } from "googleapis";

let driveClient: drive_v3.Drive | null = null;

function getDriveClient(): drive_v3.Drive {
  if (driveClient) return driveClient;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
        /\\n/g,
        "\n"
      ),
    },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  driveClient = google.drive({ version: "v3", auth });
  return driveClient;
}

export async function listFolder(
  folderId: string,
  pageToken?: string,
  pageSize: number = 100
) {
  const drive = getDriveClient();
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields:
      "nextPageToken, files(id, name, mimeType, size, modifiedTime, iconLink, thumbnailLink, parents)",
    orderBy: "folder, name",
    pageSize,
    pageToken,
  });

  return {
    files: (response.data.files || []).map((file) => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      size: file.size || undefined,
      modifiedTime: file.modifiedTime || undefined,
      iconLink: file.iconLink || undefined,
      thumbnailLink: file.thumbnailLink || undefined,
      parents: file.parents || undefined,
      isFolder: file.mimeType === "application/vnd.google-apps.folder",
    })),
    nextPageToken: response.data.nextPageToken || undefined,
  };
}

export async function getFileMetadata(fileId: string) {
  const drive = getDriveClient();
  const response = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size, modifiedTime, parents, iconLink",
  });
  return response.data;
}

export async function downloadFile(fileId: string) {
  const drive = getDriveClient();
  const meta = await drive.files.get({
    fileId,
    fields: "mimeType, name",
  });

  const mimeType = meta.data.mimeType || "";
  const isGoogleDoc = mimeType.startsWith("application/vnd.google-apps.");

  if (isGoogleDoc) {
    const exportMimeMap: Record<string, string> = {
      "application/vnd.google-apps.document":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.google-apps.spreadsheet":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.google-apps.presentation":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.google-apps.drawing": "application/pdf",
    };
    const exportMime = exportMimeMap[mimeType] || "application/pdf";

    const response = await drive.files.export(
      { fileId, mimeType: exportMime },
      { responseType: "stream" }
    );
    return {
      stream: response.data,
      mimeType: exportMime,
      name: meta.data.name!,
    };
  }

  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );
  return { stream: response.data, mimeType, name: meta.data.name! };
}

export async function uploadFile(
  parentId: string,
  fileName: string,
  mimeType: string,
  body: NodeJS.ReadableStream
) {
  const drive = getDriveClient();
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [parentId],
    },
    media: {
      mimeType,
      body,
    },
    fields: "id, name, mimeType, size, modifiedTime",
  });
  return response.data;
}

export async function createFolder(parentId: string, folderName: string) {
  const drive = getDriveClient();
  const response = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id, name, mimeType, modifiedTime",
  });
  return response.data;
}

export async function renameItem(fileId: string, newName: string) {
  const drive = getDriveClient();
  const response = await drive.files.update({
    fileId,
    requestBody: { name: newName },
    fields: "id, name, mimeType, modifiedTime",
  });
  return response.data;
}

export async function moveItem(
  fileId: string,
  newParentId: string,
  currentParentId: string
) {
  const drive = getDriveClient();
  const response = await drive.files.update({
    fileId,
    addParents: newParentId,
    removeParents: currentParentId,
    fields: "id, name, mimeType, modifiedTime, parents",
  });
  return response.data;
}

export async function deleteItem(fileId: string) {
  const drive = getDriveClient();
  await drive.files.update({
    fileId,
    requestBody: { trashed: true },
  });
}

export async function searchFiles(query: string, rootFolderId: string) {
  const drive = getDriveClient();

  async function getAllFolderIds(parentId: string): Promise<string[]> {
    const ids = [parentId];
    const res = await drive.files.list({
      q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id)",
      pageSize: 1000,
    });
    if (res.data.files) {
      for (const f of res.data.files) {
        if (f.id) {
          const childIds = await getAllFolderIds(f.id);
          ids.push(...childIds);
        }
      }
    }
    return ids;
  }

  const folderIds = await getAllFolderIds(rootFolderId);
  const parentQueries = folderIds
    .map((id) => `'${id}' in parents`)
    .join(" or ");

  const response = await drive.files.list({
    q: `(${parentQueries}) and name contains '${query.replace(/'/g, "\\'")}' and trashed = false`,
    fields:
      "files(id, name, mimeType, size, modifiedTime, iconLink, thumbnailLink, parents)",
    orderBy: "modifiedTime desc",
    pageSize: 50,
  });

  return (response.data.files || []).map((file) => ({
    id: file.id!,
    name: file.name!,
    mimeType: file.mimeType!,
    size: file.size || undefined,
    modifiedTime: file.modifiedTime || undefined,
    iconLink: file.iconLink || undefined,
    thumbnailLink: file.thumbnailLink || undefined,
    parents: file.parents || undefined,
    isFolder: file.mimeType === "application/vnd.google-apps.folder",
  }));
}

export async function getFolderPath(
  folderId: string,
  rootFolderId: string
): Promise<{ id: string; name: string }[]> {
  const drive = getDriveClient();
  const path: { id: string; name: string }[] = [];
  let currentId = folderId;

  while (currentId && currentId !== rootFolderId) {
    const res = await drive.files.get({
      fileId: currentId,
      fields: "id, name, parents",
    });
    path.unshift({ id: res.data.id!, name: res.data.name! });
    currentId = res.data.parents?.[0] || "";
  }

  path.unshift({ id: rootFolderId, name: "Atlas" });
  return path;
}
