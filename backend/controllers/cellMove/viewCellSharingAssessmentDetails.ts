import moment from 'moment'
import { putLastNameFirst, hasLength } from '../../utils'
import { getBackLinkData, translateCsra } from './cellMoveUtils'

export default ({ prisonApi, logError }) =>
  async (req, res) => {
    const { offenderNo } = req.params

    try {
      const [offenderDetails, assessments] = await Promise.all([
        prisonApi.getDetails(res.locals, offenderNo, true),
        prisonApi.getCsraAssessments(res.locals, [offenderNo]),
      ])

      const { firstName, lastName, assignedLivingUnit } = offenderDetails || {}

      const mostRecentAssessment =
        hasLength(assessments) && assessments.sort((a, b) => b.assessmentDate.localeCompare(a.assessmentDate))[0]

      const location =
        mostRecentAssessment &&
        mostRecentAssessment.assessmentAgencyId &&
        (await prisonApi.getAgencyDetails(res.locals, mostRecentAssessment.assessmentAgencyId))

      return res.render('cellMove/cellSharingRiskAssessmentDetails.njk', {
        prisonerName: putLastNameFirst(firstName, lastName),
        cellLocation: (assignedLivingUnit && assignedLivingUnit.description) || 'Not entered',
        location: (location && location.description) || 'Not entered',
        level: mostRecentAssessment && translateCsra(mostRecentAssessment.classificationCode),
        date:
          (mostRecentAssessment &&
            mostRecentAssessment.assessmentDate &&
            moment(mostRecentAssessment.assessmentDate, 'YYYY-MM-DD').format('D MMMM YYYY')) ||
          'Not entered',
        comment: (mostRecentAssessment && mostRecentAssessment.assessmentComment) || 'Not entered',
        ...getBackLinkData(req.headers.referer, offenderNo),
      })
    } catch (error) {
      res.locals.redirectUrl = `/prisoner/${offenderNo}/cell-move/search-for-cell`
      res.locals.homeUrl = `/prisoner/${offenderNo}`
      throw error
    }
  }
