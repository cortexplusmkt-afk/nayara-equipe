import { api } from './api';

import type {
  TeamAssignment,
} from './roles';

export interface DocumentUploadPayload {
  titulo: File;
  identidade: File;
  endereco: File;
}

export interface UploadedDocument {
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
}

export interface PersonalData {
  nome: string;
  cpf: string;
  rg: string;
  nascimento: string;
  nomeMae: string;
}

export interface ElectoralData {
  titulo: string;
  zona: string;
  secao: string;
  municipio: string;
  uf: string;
}

export interface AddressData {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  quadra: string;
  lote: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface ExtractedFields {
  personal: PersonalData;
  electoral: ElectoralData;
  address: AddressData;
}

export interface Extraction {
  raw: {
    titulo: string;
    identidade: string;
    endereco: string;
  };

  fields: ExtractedFields;
}

export interface UploadResponse {
  success: boolean;
  uploadId: string;
  message: string;
  status: string;

  documents: {
    titulo: UploadedDocument;
    identidade: UploadedDocument;
    endereco: UploadedDocument;
  };
}

export interface ExtractResponse {
  success: boolean;
  uploadId: string;
  status: string;
  extraction: Extraction;
}

export interface UploadDetails {
  uploadId: string;
  createdAt: string;
  updatedAt?: string;
  status: string;

  documents: {
    titulo: UploadedDocument;
    identidade: UploadedDocument;
    endereco: UploadedDocument;
  };

  extraction?: Extraction;

  reviewedData?: ExtractedFields;

  team?: TeamAssignment;
}

export async function uploadDocuments(
  payload: DocumentUploadPayload,
) {
  const formData =
    new FormData();

  formData.append(
    'titulo',
    payload.titulo,
  );

  formData.append(
    'identidade',
    payload.identidade,
  );

  formData.append(
    'endereco',
    payload.endereco,
  );

  const response =
    await api.post<UploadResponse>(
      '/documents/upload',
      formData,
    );

  return response.data;
}

export async function extractDocuments(
  uploadId: string,
) {
  const response =
    await api.post<ExtractResponse>(
      `/documents/${uploadId}/extract`,
    );

  return response.data;
}

export async function getUpload(
  uploadId: string,
) {
  const response =
    await api.get<UploadDetails>(
      `/documents/${uploadId}`,
    );

  return response.data;
}

export async function saveReview(
  uploadId: string,
  data: ExtractedFields,
  team: TeamAssignment,
) {
  const response =
    await api.put(
      `/documents/${uploadId}/review`,
      {
        ...data,
        team: {
          roleId:
            team.roleId,
        },
      },
    );

  return response.data;
}

export interface FinalizeResponse {
  success: boolean;
  cadastroId: string;
  status: string;

  pdf: {
    filename: string;
  };
}

export async function finalizeRegistration(
  uploadId: string,
) {

  const response =
    await api.post<FinalizeResponse>(
      `/documents/${uploadId}/finalize`,
    );

  return response.data;
}
