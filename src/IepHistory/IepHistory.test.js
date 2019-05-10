import React from 'react'
import { shallow } from 'enzyme'
import IepHistory from './IepHistory'
import CurrentIepLevel from './CurrentIepLevel'

const initialState = {
  iepHistory: {
    currentIepLevel: 'Standard',
    daysOnIepLevel: 625,
    currentIepDateTime: '2017-08-15T16:04:35',
    nextReviewDate: '15/08/2018',
    establishments: [{ agencyId: 'LEI', description: 'Leeds' }],
    levels: ['Standard'],
    results: [
      {
        bookingId: -1,
        iepDate: '2017-08-13',
        iepTime: '2017-08-13T16:04:35',
        formattedTime: '13/08/2017 - 16:04',
        iepEstablishment: 'Leeds',
        iepStaffMember: 'Staff Member',
        agencyId: 'LEI',
        iepLevel: 'Standard',
        userId: 'ITAG_USER',
      },
    ],
    offenderName: 'ANDERSON, ARTHUR',
  },
}

describe('IEP History', () => {
  const store = {}
  const history = {}
  beforeEach(() => {
    store.getState = jest.fn()
    store.subscribe = jest.fn()
    store.dispatch = jest.fn()
    history.push = jest.fn()
    history.replace = jest.fn()
    store.getState.mockReturnValue(initialState)
  })

  it('should render the iep history table correctly', () => {
    const wrapper = shallow(<IepHistory store={store} />)

    expect(wrapper).toMatchSnapshot()
  })

  it('should render the current IEP level correctly', () => {
    const wrapper = shallow(<CurrentIepLevel store={store} />)

    expect(wrapper).toMatchSnapshot()
  })
})
