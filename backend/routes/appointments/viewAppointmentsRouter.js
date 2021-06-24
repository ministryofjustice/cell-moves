const moment = require('moment')
const { serviceUnavailableMessage } = require('../../common-messages')
const { getTime, properCaseName, getCurrentPeriod, formatName } = require('../../utils')

const prisonApiLocationDescription = async (res, whereaboutsApi, locationKey, userCaseLoad) => {
  const fullLocationPrefix = await whereaboutsApi.getAgencyGroupLocationPrefix(res.locals, userCaseLoad, locationKey)

  if (fullLocationPrefix) {
    const locationIdWithSuffix = fullLocationPrefix.locationPrefix
    return locationIdWithSuffix?.length < 1 ? '' : locationIdWithSuffix.slice(0, -1)
  }
  return `${userCaseLoad}-${locationKey}`
}

module.exports =
  ({ prisonApi, whereaboutsApi, logError }) =>
  async (req, res) => {
    const { date, timeSlot = getCurrentPeriod(), type, locationId, residentialLocation } = req.query
    const searchDate = date ? moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD') : moment().format('YYYY-MM-DD')
    const agencyId = req.session.userDetails.activeCaseLoadId

    const locationDesc = residentialLocation
      ? await prisonApiLocationDescription(res, whereaboutsApi, residentialLocation, agencyId)
      : agencyId

    const [appointmentTypes, appointmentLocations, appointments, residentialLocations] = await Promise.all([
      prisonApi.getAppointmentTypes(res.locals),
      prisonApi.getLocationsForAppointments(res.locals, agencyId),
      whereaboutsApi.getAppointments(res.locals, agencyId, {
        date: searchDate,
        timeSlot: timeSlot !== 'All' ? timeSlot : undefined,
        locationId,
        offenderLocationPrefix: locationDesc,
      }),
      whereaboutsApi.searchGroups(res.locals, agencyId),
    ])

    const videoLinkAppointmentIds = appointments
      .filter((appointment) => appointment.appointmentTypeCode === 'VLB')
      .map((videoLinkAppointment) => videoLinkAppointment.id)

    const videoLinkAppointmentResponse = await whereaboutsApi.getVideoLinkAppointments(
      res.locals,
      videoLinkAppointmentIds
    )
    const videoLinkAppointments = (videoLinkAppointmentResponse && videoLinkAppointmentResponse.appointments) || []
    const videoLinkAppointmentsMadeByTheCourt = videoLinkAppointments.filter(
      (appointment) => appointment.madeByTheCourt
    )

    const videoLinkCourtMappings = videoLinkAppointments
      .filter((appointment) => appointment.madeByTheCourt === false)
      .map((appointment) => ({
        appointmentId: appointment.appointmentId,
        court: appointment.court,
      }))

    const addBookingIdAndHearingTypesToVLBAppointments = (appointment) => {
      let enhancedAppointment
      if (appointment.appointmentTypeCode === 'VLB') {
        videoLinkAppointments.forEach((vlAppointment) => {
          if (vlAppointment.appointmentId === appointment.id) {
            enhancedAppointment = {
              ...appointment,
              hearingType: vlAppointment.hearingType,
              bookingId: vlAppointment.bookingId,
            }
          }
        })
      }
      return enhancedAppointment || appointment
    }

    const addDisplayTimesForVLBAppointments = (appointment, index, appointmentsArray) => {
      const preAppointment = appointmentsArray.find(
        (otherAppointment) =>
          otherAppointment.bookingId === appointment.bookingId && otherAppointment.hearingType === 'PRE'
      )
      const postAppointment = appointmentsArray.find(
        (otherAppointment) =>
          otherAppointment.bookingId === appointment.bookingId && otherAppointment.hearingType === 'POST'
      )
      return {
        ...appointment,
        startTime: preAppointment ? preAppointment.startTime : appointment.startTime,
        endTime: postAppointment ? postAppointment.endTime : appointment.endTime,
      }
    }

    const appointmentsEnhanced = appointments
      .filter((appointment) => (type ? appointment.appointmentTypeCode === type : true))
      .map((appointment) => addBookingIdAndHearingTypesToVLBAppointments(appointment))
      .map((appointment, index, appointmentsArray) =>
        addDisplayTimesForVLBAppointments(appointment, index, appointmentsArray)
      )
      .filter(
        (appointment) =>
          !(
            (appointment.appointmentTypeCode === 'VLB' && appointment.hearingType === 'PRE') ||
            (appointment.appointmentTypeCode === 'VLB' && appointment.hearingType === 'POST')
          )
      )
      .map(async (appointment) => {
        const { startTime, endTime, offenderNo } = appointment
        const offenderName = `${properCaseName(appointment.lastName)}, ${properCaseName(appointment.firstName)}`
        const offenderUrl = `/prisoner/${offenderNo}`

        const videoLinkLocation =
          appointment.appointmentTypeCode === 'VLB' &&
          videoLinkAppointmentsMadeByTheCourt.find(
            (videoLinkAppointment) => videoLinkAppointment.appointmentId === appointment.id
          )

        const prisonerDetails = await prisonApi.getDetails(res.locals, offenderNo, true).catch((error) => {
          logError(req.originalUrl, error, serviceUnavailableMessage)
          return null
        })

        const getCourtDescription = () => {
          if (videoLinkLocation) return `${appointment.locationDescription}</br>with: ${videoLinkLocation.court}`

          const courtMapping = videoLinkCourtMappings.find((mapping) => mapping.appointmentId === appointment.id)

          return (
            (courtMapping && `${appointment.locationDescription}</br>with: ${courtMapping.court}`) ||
            appointment.locationDescription
          )
        }

        return [
          {
            text: endTime ? `${getTime(startTime)} to ${getTime(endTime)}` : getTime(startTime),
          },
          {
            html: `<a href="${offenderUrl}" class="govuk-link">${offenderName} - ${offenderNo}</a>`,
            attributes: {
              'data-sort-value': appointment.lastName,
            },
          },
          {
            text: prisonerDetails?.assignedLivingUnit?.description,
          },
          {
            text: appointment.appointmentTypeDescription,
          },
          {
            html: getCourtDescription(),
          },
          {
            html: `<a href="/appointment-details/${
              appointment.id
            }" class="govuk-link" aria-label="View details of ${formatName(
              appointment.firstName,
              appointment.lastName
            )}'s appointment">View details </a>`,
          },
        ]
      })

    const appointmentRows = await Promise.all(appointmentsEnhanced)

    const types = appointmentTypes.map((appointmentType) => ({
      text: appointmentType.description,
      value: appointmentType.code,
    }))

    const locations = appointmentLocations.map((appointmentLocation) => ({
      text: appointmentLocation.userDescription,
      value: appointmentLocation.locationId,
    }))

    return res.render('viewAppointments.njk', {
      types,
      locations,
      timeSlot,
      type,
      appointmentRows,
      locationId: locationId && Number(locationId),
      residentialLocation,
      residentialLocationOptions: residentialLocations.map((location) => ({
        text: location.name,
        value: location.key,
      })),
      date: moment(searchDate).format('DD/MM/YYYY'),
      formattedDate: moment(searchDate).format('D MMMM YYYY'),
    })
  }
