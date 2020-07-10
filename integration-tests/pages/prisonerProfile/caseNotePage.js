const page = require('../page')

const row = i => cy.get(`tbody tr`).eq(i)

const column = (i, j) =>
  row(i)
    .find('td')
    .eq(j)

const caseNotePage = offenderName =>
  page(offenderName, {
    getRows: i => ({
      createdBy: () => column(i, 0),
      caseNoteDetails: () => column(i, 1),
      caseNoteAddMoreDetailsLink: () => cy.get('[data-test="add-more-details"]'),
      caseNotePrintIncentiveLevelSlipLink: () => cy.get('[data-test="print-slip"]'),
    }),
  })

export default {
  verifyOnPage: caseNotePage,
  goTo: offenderNo => {
    cy.visit(`/prisoner/${offenderNo}/case-notes`)
    return caseNotePage()
  },
}
