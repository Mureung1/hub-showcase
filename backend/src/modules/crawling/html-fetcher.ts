import axios from 'axios'
import * as cheerio from 'cheerio'
import { AppError } from '../../shared/errors/app-error.js'

export async function fetchHtml(url: string) {
  try {
    const response = await axios.get<string>(url, {
      responseType: 'text',
      timeout: 10000,
    })

    return cheerio.load(response.data)
  } catch {
    throw new AppError(400, `공지 사이트에 접속할 수 없습니다: ${url}`)
  }
}
