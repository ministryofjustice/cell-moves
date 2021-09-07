import nock from 'nock'
import CuriousApi from './curiousApi'
import clientFactory from '../oauthEnabledClient'

const hostname = 'http://localhost:8080'

const client = clientFactory({ baseUrl: `${hostname}` })
const curiousApi = CuriousApi.create(client)
const mock = nock(hostname)
const accessToken = 'test_access_token'

describe('curiousApi', () => {
  afterEach(() => {
    nock.cleanAll()
  })

  describe('getLearnerProfiles', () => {
    const dummyLearnerProfiles = getDummyLearnerProfiles()
    it('should return the expected response data', async () => {
      const nomisId = dummyLearnerProfiles[0].prn
      mock
        .get(`/learnerProfile/${nomisId}`)
        .matchHeader('authorization', `Bearer ${accessToken}`)
        .reply(200, dummyLearnerProfiles)

      const actual = await curiousApi.getLearnerProfiles({ access_token: accessToken }, nomisId)
      expect(actual).toEqual(dummyLearnerProfiles)
    })

    it('should return the expected response data with establishmentid in query', async () => {
      const nomisId = dummyLearnerProfiles[0].prn
      const { establishmentId } = dummyLearnerProfiles[0]
      mock
        .get(`/learnerProfile/${nomisId}?establishmentId=${establishmentId}`)
        .matchHeader('authorization', `Bearer ${accessToken}`)
        .reply(200, [dummyLearnerProfiles[0]])

      const actual = await curiousApi.getLearnerProfiles({ access_token: accessToken }, nomisId, establishmentId)
      expect(actual).toContainEqual(dummyLearnerProfiles[0])
    })
  })

  describe('getLearnerEducation', () => {
    const dummyEducations = getDummyEducations()
    it('should return the expected response data', async () => {
      const nomisId = dummyEducations.content[0].prn
      mock
        .get(`/learnerEducation/${nomisId}`)
        .matchHeader('authorization', `Bearer ${accessToken}`)
        .reply(200, dummyEducations)

      const actual = await curiousApi.getLearnerEducation({ access_token: accessToken }, nomisId)
      expect(actual).toEqual(dummyEducations)
    })
    it('should call the api with the correct parameters', async () => {
      const nomisId = dummyEducations.content[1].prn
      const { establishmentId } = dummyEducations.content[1]
      mock
        .get(
          `/learnerEducation/${nomisId}?sort=establishmentName&isCurrent=true&establishmentId=${establishmentId}&page=1&size=5`
        )
        .matchHeader('authorization', `Bearer ${accessToken}`)
        .reply(200, [dummyEducations.content[1]])

      await curiousApi.getLearnerEducation(
        { access_token: accessToken },
        nomisId,
        'establishmentName',
        true,
        establishmentId,
        1,
        5
      )
    })
  })

  describe('getLearnerLatestAssessments', () => {
    const dummyLearnerLatestAssessments = getDummyLearnerLatestAssessments()
    it('should return the expected response data', async () => {
      const nomisId = dummyLearnerLatestAssessments[0].prn
      mock
        .get(`/latestLearnerAssessments/${nomisId}`)
        .matchHeader('authorization', `Bearer ${accessToken}`)
        .reply(200, dummyLearnerLatestAssessments)
      const actual = await curiousApi.getLearnerLatestAssessments({ access_token: accessToken }, nomisId)
      expect(actual).toEqual(dummyLearnerLatestAssessments)
    })
  })

  describe('getLearnerGoals', () => {
    const dummyLearnerGoals = getDummyLearnerGoals()
    it('should return the expected response data', async () => {
      const nomisId = dummyLearnerGoals.prn
      mock
        .get(`/learnerGoals/${nomisId}`)
        .matchHeader('authorization', `Bearer ${accessToken}`)
        .reply(200, dummyLearnerGoals)
      const actual = await curiousApi.getLearnerGoals({ access_token: accessToken }, nomisId)
      expect(actual).toEqual(dummyLearnerGoals)
    })
  })
})

function getDummyLearnerProfiles(): curious.LearnerProfile[] {
  return [
    {
      prn: 'G6123VU',
      establishmentId: 'MDI',
      establishmentName: 'HMP Moorland',
      uln: '1234123412',
      lddHealthProblem:
        'Learner considers himself or herself to have a learning difficulty and/or disability and/or health problem.',
      priorAttainment: 'Full level 3',
      qualifications: [
        {
          qualificationType: 'English',
          qualificationGrade: 'Level 1',
          assessmentDate: '2021-05-13',
        },
        {
          qualificationType: 'Maths',
          qualificationGrade: 'Level 1',
          assessmentDate: '2021-05-20',
        },
        {
          qualificationType: 'Digital Literacy',
          qualificationGrade: 'Level 2',
          assessmentDate: '2021-05-19',
        },
      ],
      languageStatus: 'English',
      plannedHours: 200,
      rapidAssessmentDate: null,
      inDepthAssessmentDate: null,
      primaryLDDAndHealthProblem: 'Visual impairment',
      additionalLDDAndHealthProblems: [
        'Hearing impairment',
        'Social and emotional difficulties',
        'Mental health difficulty',
      ],
    },
    {
      prn: 'G6123VU',
      establishmentId: 'QWER',
      establishmentName: 'HMP Wakefield',
      uln: '9876987654',
      lddHealthProblem: null,
      priorAttainment: null,
      qualifications: [
        {
          qualificationType: 'English',
          qualificationGrade: 'Entry Level 1',
          assessmentDate: '2019-03-01',
        },
        {
          qualificationType: 'Maths',
          qualificationGrade: 'Entry Level 1',
          assessmentDate: '2019-03-01',
        },
        {
          qualificationType: 'Digital Literacy',
          qualificationGrade: 'Entry Level 1',
          assessmentDate: '2019-03-01',
        },
      ],
      languageStatus: 'English',
      plannedHours: null,
      rapidAssessmentDate: null,
      inDepthAssessmentDate: null,
      primaryLDDAndHealthProblem: null,
      additionalLDDAndHealthProblems: [],
    },
  ]
}

function getDummyEducations(): curious.LearnerEducation {
  return {
    content: [
      {
        prn: 'G3609VL',
        establishmentId: 'MDI',
        establishmentName: 'HMP Moorland',
        courseName: 'Ocean Science',
        courseCode: '008OCE001',
        isAccredited: false,
        aimSequenceNumber: 1,
        learningStartDate: '2021-07-01',
        learningPlannedEndDate: '2021-10-03',
        learningActualEndDate: '2021-08-04',
        learnersAimType: null,
        miNotionalNVQLevelV2: null,
        sectorSubjectAreaTier1: null,
        sectorSubjectAreaTier2: null,
        occupationalIndicator: null,
        accessHEIndicator: null,
        keySkillsIndicator: null,
        functionalSkillsIndicator: null,
        gceIndicator: null,
        gcsIndicator: null,
        asLevelIndicator: null,
        a2LevelIndicator: null,
        qcfIndicator: null,
        qcfDiplomaIndicator: null,
        qcfCertificateIndicator: null,
        lrsGLH: null,
        attendedGLH: null,
        actualGLH: 100,
        outcome: 'No achievement',
        outcomeGrade: 'Fail',
        employmentOutcome: null,
        withdrawalReasons: null,
        prisonWithdrawalReason: null,
        completionStatus: 'The learner has completed the learning activities leading to the learning aim',
        withdrawalReasonAgreed: false,
        fundingModel: 'Adult skills',
        fundingAdjustmentPriorLearning: null,
        subcontractedPartnershipUKPRN: null,
        deliveryLocationPostCode: 'DN7 6BW',
        unitType: null,
        fundingType: 'DPS',
        deliveryMethodType: 'Face to Face Assessment',
        alevelIndicator: null,
      },
      {
        prn: 'G3609VL',
        establishmentId: 'WAK',
        establishmentName: 'HMP Wakefield',
        courseName: 'Foundation Degree in Welfare of Animals (Animal Collections)',
        courseCode: '246674',
        isAccredited: true,
        aimSequenceNumber: null,
        learningStartDate: '2021-06-07',
        learningPlannedEndDate: '2022-01-30',
        learningActualEndDate: '2021-07-08',
        learnersAimType: 'Learning aim that is not part of a programme',
        miNotionalNVQLevelV2: 'Level 5',
        sectorSubjectAreaTier1: 'Science and Mathematics',
        sectorSubjectAreaTier2: 'Science',
        occupationalIndicator: false,
        accessHEIndicator: false,
        keySkillsIndicator: false,
        functionalSkillsIndicator: false,
        gceIndicator: false,
        gcsIndicator: false,
        asLevelIndicator: false,
        a2LevelIndicator: false,
        qcfIndicator: false,
        qcfDiplomaIndicator: false,
        qcfCertificateIndicator: false,
        lrsGLH: 0,
        attendedGLH: 100,
        actualGLH: 300,
        outcome: null,
        outcomeGrade: null,
        employmentOutcome: null,
        withdrawalReasons: 'Other',
        prisonWithdrawalReason: 'Changes in their risk profile meaning they can no longer take part in the learning',
        completionStatus: 'The learner has withdrawn from the learning activities leading to the learning aim',
        withdrawalReasonAgreed: true,
        fundingModel: 'Adult skills',
        fundingAdjustmentPriorLearning: null,
        subcontractedPartnershipUKPRN: null,
        deliveryLocationPostCode: 'WF2 9AG',
        unitType: 'QUALIFICATION',
        fundingType: 'DPS',
        deliveryMethodType: null,
        alevelIndicator: false,
      },
      {
        prn: 'G3609VL',
        establishmentId: 'NEW',
        establishmentName: 'HMP New Hall',
        courseName: 'CIMA Strategic Level',
        courseCode: '270828',
        isAccredited: true,
        aimSequenceNumber: 1,
        learningStartDate: '2016-07-15',
        learningPlannedEndDate: '2017-01-01',
        learningActualEndDate: '2016-12-08',
        learnersAimType: 'Component learning aim within a programme',
        miNotionalNVQLevelV2: 'Higher',
        sectorSubjectAreaTier1: 'Business, Administration and Law',
        sectorSubjectAreaTier2: 'Accounting and Finance',
        occupationalIndicator: false,
        accessHEIndicator: false,
        keySkillsIndicator: false,
        functionalSkillsIndicator: false,
        gceIndicator: false,
        gcsIndicator: false,
        asLevelIndicator: false,
        a2LevelIndicator: false,
        qcfIndicator: false,
        qcfDiplomaIndicator: false,
        qcfCertificateIndicator: false,
        lrsGLH: 0,
        attendedGLH: null,
        actualGLH: 200,
        outcome: 'Achieved',
        outcomeGrade: 'Pass',
        employmentOutcome: null,
        withdrawalReasons: null,
        prisonWithdrawalReason: null,
        completionStatus: 'The learner has completed the learning activities leading to the learning aim',
        withdrawalReasonAgreed: false,
        fundingModel: 'Adult skills',
        fundingAdjustmentPriorLearning: null,
        subcontractedPartnershipUKPRN: null,
        deliveryLocationPostCode: 'WF4 4XX',
        unitType: 'QUALIFICATION',
        fundingType: 'DPS',
        deliveryMethodType: null,
        alevelIndicator: false,
      },
    ],
    number: 0,
    size: 10,
    totalElements: 3,
    first: true,
    last: true,
    hasContent: true,
    numberOfElements: 3,
    totalPages: 1,
    pageable: {
      sort: [],
      pageSize: 10,
      pageNumber: 0,
      offset: 0,
      unpaged: false,
      paged: true,
    },
    empty: false,
  }
}

function getDummyLearnerLatestAssessments(): curious.LearnerLatestAssessment[] {
  return [
    {
      prn: 'G8346GA',
      qualifications: [
        {
          establishmentId: 'WIN',
          establishmentName: 'HMP Winchester',
          qualification: {
            qualificationType: 'English',
            qualificationGrade: 'Entry Level 2',
            assessmentDate: '2021-05-02',
          },
        },
        {
          establishmentId: 'WIN',
          establishmentName: 'HMP Winchester',
          qualification: {
            qualificationType: 'English',
            qualificationGrade: 'Entry Level 2',
            assessmentDate: '2020-12-02',
          },
        },
        {
          establishmentId: 'WIN',
          establishmentName: 'HMP Winchester',
          qualification: {
            qualificationType: 'Digital Literacy',
            qualificationGrade: 'Entry Level 1',
            assessmentDate: '2020-06-01',
          },
        },
        {
          establishmentId: 'WIN',
          establishmentName: 'HMP Winchester',
          qualification: {
            qualificationType: 'Digital Literacy',
            qualificationGrade: 'Entry Level 2',
            assessmentDate: '2021-06-01',
          },
        },
        {
          establishmentId: 'WIN',
          establishmentName: 'HMP Winchester',
          qualification: {
            qualificationType: 'Maths',
            qualificationGrade: 'Entry Level 2',
            assessmentDate: '2021-06-06',
          },
        },
      ],
    },
  ]
}

function getDummyLearnerGoals(): curious.LearnerGoals {
  return {
    prn: 'G6415GD',
    employmentGoals: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean eu leo id leo pharetra fermentum. Se',
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean eu leo id leo pharetra fermentum. Se',
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean eu leo id leo pharetra fermentum. Se',
    ],
    personalGoals: [
      'Sed viverra finibus tellus, commodo dapibus mauris. Phasellus porta odio in dui mattis, et sollicitu',
      'Sed viverra finibus tellus, commodo dapibus mauris. Phasellus porta odio in dui mattis, et sollicitu',
      'Sed viverra finibus tellus, commodo dapibus mauris. Phasellus porta odio in dui mattis, et sollicitu',
    ],
    longTermGoals: ['To be rich'],
    shortTermGoals: ['Earn money'],
  }
}
