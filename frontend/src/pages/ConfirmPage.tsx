import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useRecognizeItem } from '../features/recognize/useRecognizeItem'
import { useLanguage } from '../i18n/LanguageContext'

interface ConfirmLocationState {
  file?: File
}

export default function ConfirmPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const file = (location.state as ConfirmLocationState | null)?.file
  const { data, isLoading, isError, error } = useRecognizeItem(file)
  const { lang, t } = useLanguage()

  if (!file) {
    return (
      <div>
        <PageHeader title={t('confirm.title')} backTo="/" />
        <div className="px-5 pt-[18px] pb-[90px]">
          <p className="text-sm text-sub">{t('confirm.noPhoto')}</p>
        </div>
      </div>
    )
  }

  const isNotFound = isError && axios.isAxiosError(error) && error.response?.status === 404
  const itemName = lang === 'en' && data?.item.nameEn ? data.item.nameEn : data?.item.name

  return (
    <div>
      <PageHeader title={t('confirm.title')} backTo="/" />
      <div className="px-5 pt-[18px] pb-[90px]">
        {isLoading ? (
          <p className="mt-3 text-sm text-sub">{t('confirm.analyzing')}</p>
        ) : isNotFound ? (
          <>
            <p className="mt-3 text-sm text-sub">{t('confirm.notFound')}</p>
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="mt-4 w-full rounded-md bg-green-600 py-3 text-sm font-bold text-white"
            >
              {t('confirm.goToSearch')}
            </button>
          </>
        ) : isError ? (
          <p className="mt-3 text-sm text-sub">{t('confirm.error')}</p>
        ) : data ? (
          <>
            <div className="font-display text-[22px] font-bold text-ink">{itemName}</div>
            <p className="mt-2 text-sm text-sub">{t('confirm.isThisRight')}</p>
            <button
              type="button"
              onClick={() => navigate(`/result/${data.item.id}`)}
              className="mt-4 w-full rounded-md bg-green-600 py-3 text-sm font-bold text-white"
            >
              {t('confirm.viewResult')}
            </button>
            <button type="button" onClick={() => navigate('/')} className="mt-2 w-full py-3 text-center text-sm text-sub">
              {t('confirm.retake')}
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
