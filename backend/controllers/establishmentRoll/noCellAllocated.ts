import { formatName, putLastNameFirst, getTime, stripAgencyPrefix } from '../../utils'

export default ({ oauthApi, systemOauthClient, prisonApi }) =>
  async (req, res) => {
    const {
      user: { activeCaseLoad },
    } = res.locals

    try {
      const userRoles = oauthApi.userRoles(res.locals)
      const offenders = await prisonApi.getInmatesAtLocationPrefix(res.locals, activeCaseLoad.caseLoadId)

      const offendersInCellSwap = offenders.filter((offender) => offender.assignedLivingUnitDesc === 'CSWAP')

      const offenderNumbers = offendersInCellSwap.map((offender) => offender.offenderNo)

      const systemContext = await systemOauthClient.getClientCredentialsTokens()
      const allOffendersDetails = offenderNumbers.length
        ? await prisonApi.getPrisoners(
            { ...systemContext, requestHeaders: { 'page-offset': 0, 'page-limit': 2000 } },
            { offenderNos: offenderNumbers }
          )
        : []
      const allStaffUsernames = []

      const offendersWithCellHistory = await Promise.all(
        offenderNumbers.map(async (offenderNo) => {
          const { latestBookingId, ...prisonerDetails } = allOffendersDetails.find(
            (offender) => offender.offenderNo === offenderNo
          )

          const { content: cells } = await prisonApi.getOffenderCellHistory(res.locals, latestBookingId, {
            page: 0,
            size: 10000,
          })

          const cellHistoryDescendingSequence = cells.sort(
            (left, right) => right.bedAssignmentHistorySequence - left.bedAssignmentHistorySequence
          )

          const currentLocation = cellHistoryDescendingSequence[0]
          const previousLocation = cellHistoryDescendingSequence[1]

          allStaffUsernames.push(currentLocation.movementMadeBy)

          return {
            currentLocation,
            offenderNo,
            previousLocation,
            prisonerDetails,
          }
        })
      )

      const allStaffDetails = allStaffUsernames.length
        ? await prisonApi.getUserDetailsList(res.locals, [...new Set(allStaffUsernames)])
        : []

      return res.render('establishmentRoll/noCellAllocated.njk', {
        results: offendersWithCellHistory.map((offender) => {
          const { currentLocation, offenderNo, previousLocation, prisonerDetails } = offender
          const movementMadeBy = allStaffDetails.find(
            (staffUser) => staffUser.username === currentLocation.movementMadeBy
          )

          return {
            movedBy: formatName(movementMadeBy.firstName, movementMadeBy.lastName),
            offenderNo,
            previousCell: stripAgencyPrefix(previousLocation.description, activeCaseLoad.caseLoadId),
            name: putLastNameFirst(prisonerDetails.firstName, prisonerDetails.lastName),
            timeOut: getTime(previousLocation.assignmentEndDateTime),
          }
        }),
        userCanAllocateCell: userRoles && userRoles.some((role) => role.roleCode === 'CELL_MOVE'),
      })
    } catch (error) {
      res.locals.redirectUrl = `/establishment-roll`
      throw error
    }
  }
