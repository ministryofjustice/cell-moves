const moment = require('moment')
const { serviceUnavailableMessage } = require('../../common-messages')
const {
  app: { notmEndpointUrl: dpsUrl },
} = require('../../config')
const { formatTimestampToDate, formatCurrency, capitalizeUppercaseString } = require('../../utils')
const formatAward = require('../../shared/formatAward')
const filterActivitiesByPeriod = require('../../shared/filterActivitiesByPeriod')
const getValueByType = require('../../shared/getValueByType')

const log = require('../../log')

const captureErrorAndContinue = apiCall =>
  new Promise(resolve => {
    apiCall.then(response => resolve({ response })).catch(error => {
      log.error(error)
      resolve({ error: true })
    })
  })

const extractResponse = (complexData, key) => {
  if (!complexData || complexData.error) return null

  return key ? complexData.response[key] : complexData.response
}

module.exports = ({ prisonerProfileService, elite2Api, logError }) => async (req, res) => {
  const { offenderNo } = req.params

  try {
    const details = await elite2Api.getDetails(res.locals, offenderNo)

    try {
      const { bookingId } = details || {}

      const dateThreeMonthsAgo = moment()
        .subtract(3, 'months')
        .format('YYYY-MM-DD')
      const today = moment().format('YYYY-MM-DD')

      const [
        prisonerProfileDataResponse,
        offenceDataResponse,
        balanceDataResponse,
        prisonerDataResponse,
        sentenceDataResponse,
        iepSummaryResponse,
        positiveCaseNotesResponse,
        negativeCaseNotesResponse,
        adjudicationsResponse,
        nextVisitResponse,
        visitBalancesResponse,
        todaysEventsResponse,
        profileInformationResponse,
      ] = await Promise.all(
        [
          prisonerProfileService.getPrisonerProfileData(res.locals, offenderNo),
          elite2Api.getMainOffence(res.locals, bookingId),
          elite2Api.getPrisonerBalances(res.locals, bookingId),
          elite2Api.getPrisonerDetails(res.locals, offenderNo),
          elite2Api.getPrisonerSentenceDetails(res.locals, offenderNo),
          elite2Api.getIepSummaryForBooking(res.locals, bookingId, false),
          elite2Api.getPositiveCaseNotes(res.locals, bookingId, dateThreeMonthsAgo, today),
          elite2Api.getNegativeCaseNotes(res.locals, bookingId, dateThreeMonthsAgo, today),
          elite2Api.getAdjudicationsForBooking(res.locals, bookingId),
          elite2Api.getNextVisit(res.locals, bookingId),
          elite2Api.getPrisonerVisitBalances(res.locals, offenderNo),
          elite2Api.getEventsForToday(res.locals, bookingId),
          elite2Api.getProfileInformation(res.locals, bookingId),
        ].map(apiCall => captureErrorAndContinue(apiCall))
      )

      const [
        prisonerProfileData,
        offenceData,
        balanceData,
        prisonerData,
        sentenceData,
        iepSummary,
        positiveCaseNotes,
        negativeCaseNotes,
        adjudications,
        nextVisit,
        visitBalances,
        todaysEvents,
        profileInformation,
      ] = [
        prisonerProfileDataResponse,
        offenceDataResponse,
        balanceDataResponse,
        prisonerDataResponse,
        sentenceDataResponse,
        iepSummaryResponse,
        positiveCaseNotesResponse,
        negativeCaseNotesResponse,
        adjudicationsResponse,
        nextVisitResponse,
        visitBalancesResponse,
        todaysEventsResponse,
        profileInformationResponse,
      ].map(response => extractResponse(response))

      const prisoner = prisonerData && prisonerData[0]
      const { morningActivities, afternoonActivities, eveningActivities } = filterActivitiesByPeriod(todaysEvents)
      const unableToShowDetailMessage = 'Unable to show this detail.'

      const daysSinceReview = (iepSummary && iepSummary.daysSinceReview) || 0

      return res.render('prisonerProfile/prisonerQuickLook/prisonerQuickLook.njk', {
        dpsUrl,
        prisonerProfileData: {
          ...prisonerProfileData,
          keyWorkerName: prisonerProfileData.keyWorkerName || 'None assigned',
          keyWorkerLastSession: prisonerProfileData.keyWorkerLastSession || 'No previous session',
          csra: prisonerProfileData.csra || 'Not entered',
          category: prisonerProfileData.category || 'Not entered',
        },
        offenceDetailsSectionError: Boolean(
          offenceDataResponse.error && prisonerDataResponse.error && sentenceDataResponse.error
        ),
        offenceDetails: [
          {
            label: 'Main offence(s)',
            value: offenceDataResponse.error
              ? unableToShowDetailMessage
              : (offenceData && offenceData[0] && offenceData[0].offenceDescription) || 'Not entered',
          },
          {
            label: 'Imprisonment status',
            value: prisonerDataResponse.error
              ? unableToShowDetailMessage
              : (prisoner && prisoner.imprisonmentStatusDesc) || 'Not entered',
          },
          {
            label: 'Release date',
            value: sentenceDataResponse.error
              ? unableToShowDetailMessage
              : (sentenceData &&
                  sentenceData.sentenceDetail &&
                  sentenceData.sentenceDetail.releaseDate &&
                  formatTimestampToDate(sentenceData.sentenceDetail.releaseDate)) ||
                'Not entered',
          },
        ],
        balanceDetailsSectionError: Boolean(balanceDataResponse.error),
        balanceDetails: [
          {
            label: 'Spends',
            value: formatCurrency((balanceData && balanceData.spends) || 0, balanceData && balanceData.currency),
          },
          {
            label: 'Private',
            value: formatCurrency((balanceData && balanceData.cash) || 0, balanceData && balanceData.currency),
          },
          {
            label: 'Savings',
            value: formatCurrency((balanceData && balanceData.savings) || 0, balanceData && balanceData.currency),
          },
        ],
        caseNoteAdjudications: {
          caseNoteAdjudicationsSectionError: Boolean(
            negativeCaseNotesResponse.error &&
              positiveCaseNotesResponse.error &&
              iepSummaryResponse.error &&
              adjudicationsResponse.error
          ),
          details: [
            {
              label: 'Incentive level warnings',
              value: negativeCaseNotesResponse.error
                ? unableToShowDetailMessage
                : (negativeCaseNotes && negativeCaseNotes.count) || 0,
            },
            {
              label: 'Incentive encouragements',
              value: positiveCaseNotesResponse.error
                ? unableToShowDetailMessage
                : (positiveCaseNotes && positiveCaseNotes.count) || 0,
            },
            {
              label: 'Last incentive level review',
              value: iepSummaryResponse.error
                ? unableToShowDetailMessage
                : `${daysSinceReview} ${daysSinceReview === 1 ? 'day' : 'days'} ago`,
            },
            {
              label: 'Proven adjudications',
              value: adjudicationsResponse.error
                ? unableToShowDetailMessage
                : (adjudications && adjudications.adjudicationCount) || 0,
            },
          ],
          activeAdjudicationsDetailsSectionError: Boolean(adjudicationsResponse.error),
          activeAdjudicationsDetails: {
            label: 'Active adjudications',
            ...(adjudications && {
              value:
                adjudications.awards &&
                adjudications.awards
                  .map(award => formatAward(award))
                  .filter(({ status }) => status && !status.startsWith('SUSP') && status !== 'QUASHED'),
            }),
          },
        },
        personalDetailsSectionError: Boolean(prisonerDataResponse.error && profileInformationResponse.error),
        personalDetails: [
          {
            label: 'Age',
            value: prisonerDataResponse.error
              ? unableToShowDetailMessage
              : prisoner && prisoner.dateOfBirth && moment().diff(moment(prisoner.dateOfBirth), 'years'),
          },
          {
            label: 'Nationality',
            value: profileInformationResponse.error
              ? unableToShowDetailMessage
              : getValueByType('NAT', profileInformation, 'resultValue') || 'Not entered',
          },
          {
            label: 'PNC number',
            value: prisonerDataResponse.error
              ? unableToShowDetailMessage
              : (prisoner && prisoner.pncNumber) || 'Not entered',
          },
          {
            label: 'CRO number',
            value: prisonerDataResponse.error
              ? unableToShowDetailMessage
              : (prisoner && prisoner.croNumber) || 'Not entered',
          },
        ],
        visits: {
          visitSectionError: Boolean(visitBalancesResponse.error && nextVisitResponse.error),
          details: [
            {
              label: 'Remaining visits',
              value: visitBalancesResponse.error
                ? unableToShowDetailMessage
                : visitBalances && (visitBalances.remainingVo === 0 ? 0 : visitBalances.remainingVo || 'Not entered'),
            },
            {
              label: 'Remaining privileged visits',
              value: visitBalancesResponse.error
                ? unableToShowDetailMessage
                : visitBalances && (visitBalances.remainingPvo === 0 ? 0 : visitBalances.remainingPvo || 'Not entered'),
            },
            {
              label: 'Next visit date',
              value:
                (nextVisitResponse.error && unableToShowDetailMessage) ||
                (nextVisit && nextVisit.startTime ? formatTimestampToDate(nextVisit.startTime) : 'No upcoming visits'),
            },
          ],
          ...(nextVisit &&
            nextVisit.startTime && {
              nextVisitDetails: [
                { label: 'Type of visit', value: nextVisit.visitTypeDescription },
                {
                  label: 'Lead visitor',
                  value: `${capitalizeUppercaseString(nextVisit.leadVisitor)} (${nextVisit.relationshipDescription})`,
                },
              ],
            }),
        },
        scheduledActivityPeriodsSectionError: Boolean(todaysEventsResponse.error),
        scheduledActivityPeriods: [
          { label: 'Morning (AM)', value: morningActivities },
          { label: 'Afternoon (PM)', value: afternoonActivities },
          { label: 'Evening (ED)', value: eveningActivities },
        ],
      })
    } catch (error) {
      logError(req.originalUrl, error, serviceUnavailableMessage)
      return res.render('error.njk', { url: `/prisoner/${offenderNo}` })
    }
  } catch (error) {
    logError(req.originalUrl, error, serviceUnavailableMessage)
    return res.render('error.njk', { url: dpsUrl })
  }
}
