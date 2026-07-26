/** Erro HTTP tipado, compartilhado pelas Edge Functions de integrações. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}
