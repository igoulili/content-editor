
function sleep (milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function findMessage (id, state, startAt) {
  console.log(`Called findMessage id: ${id}, startAt.id: ${startAt ? startAt.id : '(undefined)'}`)
  const storiesRoot = state.stories
  if (undefined === startAt) {
    const [story, episode, phase] = id.split('/')
    const st = storiesRoot.find(s => s.id === story)
    const ep = st.episodes.find(e => e.id === `${story}/${episode}`)
    const ph = ep.phases.find(p => p.id === `${story}/${episode}/${phase}`)
    return findMessage(id, state, ph)
  } else {
    const rem = id.substr(startAt.id.length + 1)
    console.log(`rem: ${rem}`)
    if (rem === '') {
      console.log('rem is empty string -> returning startAt')
      return { message: startAt }
    } else {
      const [partial, more] = rem.split('/')
      console.log(`partial: ${partial}`)
      const msgs = startAt.messages
      if (msgs) {
        const lookingFor = startAt.id + '/' + partial
        console.log('startAt has a messages property -> trying to locate ' + lookingFor)
        const sub = msgs.find(m => m.id === lookingFor)
        if (sub) {
          if (more) {
            console.log('Found it but more = ' + more + ' -> calling findMessage again...')
            return findMessage(id, state, sub)
          } else {
            console.log('Found it, more was empty -> returning the object')
            return { message: sub, parent: startAt, index: msgs.indexOf(sub) }
          }
        } else {
          console.log('Not found -> returning null!')
          return null
        }
      }
    }
  }
}

function updateMessageStructure (state, changedMessageID) {
  const storiesRoot = state.stories
  const [story, episode, phase] = changedMessageID.split('/')
  const st = storiesRoot.find(s => s.id === story)
  const ep = st.episodes.find(e => e.id === `${story}/${episode}`)
  const ph = ep.phases.find(p => p.id === `${story}/${episode}/${phase}`)
  const allMessagesInPhase = JSON.stringify(ph.messages)
  ph.messages = JSON.parse(allMessagesInPhase)
}

function refactorMessageID (state, msg, replace, by) {
  let newID = msg.id.replace(replace, by)
  while (findMessage(newID, state)) {
    newID = newID + '-1'
  }
  msg.id = newID
  const sub = msg.messages
  if (sub) {
    for (const m in sub) {
      refactorMessageID(state, m, replace, by)
    }
  }
}

export default {
  state: () => ({
    stories: [
      {
        id: 'demo',
        title: 'Technical Demo',
        episodes: [
          {
            id: 'demo/episode',
            title: 'Demo Episode',
            phases: [
              {
                id: 'demo/episode/p1',
                title: 'Camarena introduces himself',
                specs: '',
                messages: [
                  {
                    id: 'demo/episode/p1/m1',
                    logic: '',
                    type: 'text',
                    from: 'Professor',
                    text: ''
                  }
                ],
                moods: {
                  Professor: 'happy',
                  Alicia: 'unavailable',
                  Nick: 'unavailable',
                  VZ: 'unavailable'
                },
                features: [
                  'Rover',
                  'AR',
                  'Secret Folder'
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'the-cloud',
        title: 'The Cloud',
        episodes: [
          {
            id: 'the-cloud/e1',
            title: 'Mysterious phenomena',
            specs: 'The Professor says hi',
            phases: [
              {
                id: 'the-cloud/e1/p1',
                title: 'Camarena introduces himself',
                specs: '',
                messages: [
                  {
                    id: 'the-cloud/e1/p1/m1',
                    logic: '',
                    type: 'text',
                    from: 'Professor',
                    text: 'Hello'
                  },
                  {
                    id: 'the-cloud/e1/p1/m2',
                    logic: '',
                    type: 'video',
                    from: 'Alicia',
                    text: 'Oh, hi!'
                  }
                ],
                moods: {
                  Professor: 'happy',
                  Alicia: 'unavailable',
                  Nick: 'unavailable',
                  VZ: 'unavailable'
                },
                features: [
                  'AR',
                  'Secret Folder'
                ]
              },
              {
                id: 'the-cloud/e1/p2',
                title: 'Two travellers appear',
                specs: '',
                messages: [
                  {
                    id: 'the-cloud/e1/p2/m1',
                    logic: '',
                    type: 'text',
                    from: 'Professor',
                    text: ''
                  }
                ],
                moods: {
                  Professor: 'happy',
                  Alicia: 'unavailable',
                  Nick: 'happy',
                  VZ: 'happy'
                },
                features: [
                  'Rover',
                  'Secret Folder'
                ]
              }
            ]
          },
          {
            id: 'the-cloud/e2',
            title: 'Aliens',
            specs: 'Alicia gets kidnapped by aliens',
            phases: [
              {
                id: 'the-cloud/e2/p1',
                title: 'Alicia is gone',
                specs: '',
                messages: [
                  {
                    id: 'the-cloud/e2/p1/m1',
                    logic: '',
                    type: 'text',
                    from: 'Professor',
                    text: ''
                  }
                ],
                moods: {
                  Professor: 'worried',
                  Alicia: 'unavailable',
                  Nick: 'worried',
                  VZ: 'worried'
                },
                features: [
                  'Rover',
                  'AR',
                  'Secret Folder'
                ]
              }
            ]
          }
        ]
      }
    ],
    dragInfo: {
      dragSource: null,
      removedIndex: null
    },
    isCommittingChanges: false,
    ws: null
  }),
  getters: {
    featuresInPhase: state => (phaseId) => {
      const [story, episode] = phaseId.split('/')
      const st = state.stories.find(s => s.id === story)
      const ep = st.episodes.find(e => e.id === story + '/' + episode)
      const ph = ep.phases.find(p => p.id === phaseId)
      return ph.features
    }
  },
  mutations: {
    initializeStories: (state, retrievedStories) => {
      state.stories = retrievedStories
    },
    moveEpisode: (state, { story, removedIndex, addedIndex }) => {
      if (removedIndex !== addedIndex) {
        const st = state.stories.find(s => s.id === story)
        const movedEpisode = JSON.stringify(st.episodes[removedIndex])
        const newItems = [...st.episodes]
        newItems.splice(removedIndex, 1)
        newItems.splice(addedIndex, 0, JSON.parse(movedEpisode))
        st.episodes = newItems
      }
    },
    changeEpisode: (state, { id, element, to }) => {
      const [story] = id.split('/')
      const st = state.stories.find(s => s.id === story)
      const ep = st.episodes.find(e => e.id === id)
      ep[element] = to
    },
    addEpisode: (state, { after, duplicate }) => {
      const [story] = after.id.split('/')
      const st = state.stories.find(s => s.id === story)
      const eps = st.episodes
      const i = eps.indexOf(after)
      let newIndex = eps.length + 1
      let newID = story + '/e' + newIndex
      while (eps.find(e => e.id === newID)) {
        newIndex += 1
        newID = story + '/e' + newIndex
      }
      const newEp = duplicate
        ? { ...after, id: newID }
        : {
            id: newID,
            title: '',
            specs: '',
            phases: [
              {
                id: newID + '/p1',
                title: '',
                specs: '',
                moods: { ...after.phases[after.phases.length - 1].moods },
                features: [...after.phases[after.phases.length - 1].features]
              }
            ]
          }
      st.episodes.splice(i + 1, 0, newEp)
    },
    deleteEpisode: (state, episode) => {
      const [story] = episode.id.split('/')
      const st = state.stories.find(s => s.id === story)
      const eps = st.episodes
      const i = eps.indexOf(episode)
      if (confirm(`Are you sure you want to delete episode ${i + 1}, '${episode.title}'?`)) {
        st.episodes.splice(i, 1)
      }
    },
    changeMood: (state, { phaseId, npc, to }) => {
      const [story, episode] = phaseId.split('/')
      const st = state.stories.find(s => s.id === story)
      const ep = st.episodes.find(e => e.id === story + '/' + episode)
      const ph = ep.phases.find(p => p.id === phaseId)
      if (undefined === ph.moods) {
        ph.moods = {
          Professor: 'happy',
          Alicia: 'happy',
          Nick: 'happy',
          VZ: 'happy'
        }
      }
      ph.moods[npc] = to
    },
    changeFeatures: (state, { phaseId, feature, to }) => {
      const [story, episode] = phaseId.split('/')
      const st = state.stories.find(s => s.id === story)
      const ep = st.episodes.find(e => e.id === story + '/' + episode)
      const ph = ep.phases.find(p => p.id === phaseId)
      if (undefined === ph.features) {
        ph.features = []
      } else {
        const newFeatures = [...ph.features]
        if (to) {
          newFeatures.push(feature)
        } else {
          const i = newFeatures.indexOf(feature)
          newFeatures.splice(i, 1)
        }
        ph.features = newFeatures
      }
    },
    movePhase: (state, { episode, removedIndex, addedIndex }) => {
      if (removedIndex !== addedIndex) {
        const [story] = episode.split('/')
        const st = state.stories.find(s => s.id === story)
        const ep = st.episodes.find(e => e.id === episode)
        const movedPhase = JSON.stringify(ep.phases[removedIndex])
        const newItems = [...ep.phases]
        newItems.splice(removedIndex, 1)
        newItems.splice(addedIndex, 0, JSON.parse(movedPhase))
        ep.phases = newItems
      }
    },
    changePhase: (state, { id, element, to }) => {
      const [story, episode] = id.split('/')
      const st = state.stories.find(s => s.id === story)
      const ep = st.episodes.find(e => e.id === story + '/' + episode)
      const ph = ep.phases.find(p => p.id === id)
      ph[element] = to
    },
    addPhase: (state, { after, duplicate }) => {
      const [story, episode] = after.id.split('/')
      const st = state.stories.find(s => s.id === story)
      const ep = st.episodes.find(e => e.id === story + '/' + episode)
      const phs = ep.phases
      const i = phs.indexOf(after)
      let newIndex = phs.length + 1
      let newID = `${story}/${episode}/p${newIndex}`
      while (phs.find(p => p.id === newID)) {
        newIndex += 1
        newID = `${story}/${episode}/p${newIndex}`
      }
      const newPh = duplicate
        ? { ...after, id: newID }
        : {
            id: newID,
            title: '',
            specs: '',
            moods: { ...after.moods },
            features: [...after.features],
            messages: [
              {
                id: newID + '/m1',
                logic: '',
                type: 'text',
                from: 'Professor',
                text: ''
              }
            ]
          }
      ep.phases.splice(i + 1, 0, newPh)
    },
    deletePhase: (state, phase) => {
      const [story, episode] = phase.id.split('/')
      const st = state.stories.find(s => s.id === story)
      const ep = st.episodes.find(e => e.id === story + '/' + episode)
      const phs = ep.phases
      const i = phs.indexOf(phase)
      if (confirm(`Are you sure you want to delete phase ${i + 1}, '${phase.title}'?`)) {
        ep.phases.splice(i, 1)
      }
    },
    changeMessage: (state, { id, element, to }) => {
      const { message } = findMessage(id, state)
      if (element === 'type' && undefined === message.messages) {
        message.messages = [
          {
            id: id + '/m1',
            logic: '',
            type: message.type,
            text: message.text,
            attachment: message.attachment
          }
        ]
      }
      message[element] = to
    },
    addMessage: (state, { after, duplicate }) => {
      const { parent, index } = findMessage(after.id, state)
      const msgs = parent.messages
      let newIndex = msgs.length + 1
      let newID = after.id.replace(/[^/]+$/, `m${newIndex}`)
      while (msgs.find(m => m.id === newID)) {
        newIndex += 1
        newID = after.id.replace(/[^/]+$/, `m${newIndex}`)
      }
      const newMsg = duplicate
        ? { ...after, id: newID }
        : {
            id: newID,
            logic: '',
            type: 'text',
            text: ''
          }
      msgs.splice(index + 1, 0, newMsg)
      updateMessageStructure(state, newID)
    },
    deleteMessage: (state, message) => {
      const { parent, index } = findMessage(message.id, state)
      if (confirm('Are you sure you want to delete this message?')) {
        parent.messages.splice(index, 1)
        updateMessageStructure(state, message.id)
      }
    },
    moveMessage: (state, { dragTarget, addedIndex }) => {
      const { dragSource, removedIndex } = state.dragInfo
      console.log(`moveMessage called with dragSource.id: ${dragSource.id}, dragTarget.id: ${dragTarget.id}, ri: ${removedIndex}, ai: ${addedIndex}`)
      if (removedIndex !== undefined && addedIndex !== null &&
      (dragSource !== dragTarget || removedIndex !== addedIndex)) {
        console.log('Actually doing it')
        const msgs = dragSource.messages
        const movedMessage = JSON.stringify(msgs[removedIndex])
        console.log('movedMessage: ' + movedMessage)
        const newFromMsgs = [...msgs]
        newFromMsgs.splice(removedIndex, 1)
        if (dragSource === dragTarget) {
          newFromMsgs.splice(addedIndex, 0, JSON.parse(movedMessage))
          dragSource.messages = newFromMsgs
          updateMessageStructure(state, dragSource.id)
        } else {
          const newToMsgs = [...dragTarget.messages]
          const msg = JSON.parse(movedMessage)
          refactorMessageID(state, msg, dragSource.id, dragTarget.id)
          newToMsgs.splice(addedIndex, 0, msg)
          dragSource.messages = newFromMsgs
          dragTarget.messages = newToMsgs
          updateMessageStructure(state, dragSource.id)
          updateMessageStructure(state, dragTarget.id)
        }
      } else {
        console.log('Aborting')
      }
    },
    setDragIndex: (state, index) => {
      console.log('setDragIndex called with index: ' + index)
      state.dragInfo.removedIndex = index
    },
    setDragSource: (state, { isSource, dragSource }) => {
      if (isSource) {
        console.log('setDragSource called, this isSource - setting dragSource=' + dragSource.id)
        state.dragInfo.dragSource = dragSource
      }
    },
    beginCommittingChanges: (state) => {
      state.isCommittingChanges = true
    },
    endCommittingChanges: (state) => {
      state.isCommittingChanges = false
    },
    openWebSocket: (state) => {
      const url = (
        process.env.BACKEND === 'local'
          ? 'ws://localhost:4000'
          : 'wss://proc.mastory.io'
      ) + '/content'
      const ws = new WebSocket(url)
      ws.onopen = () => {
        console.log('WebSocket connection established!')
      }
      ws.onclose = () => {
        console.log('WebSocket connection closed!')
      }
      ws.onmessage = (msg) => {
        alert(`WS server says ${msg}`)
      }
      state.ws = ws
    },
    closeWebSocket: (state) => {
      if (state.ws) {
        ws.close()
      }
    }
  },
  actions: {
    // async nuxtServerInit ({ commit }) {
    // const retrievedStories = (
    //   await this.$axios.$get('stories')
    // ).stories
    // commit('initializeStories', retrievedStories)
    // },
    async commitChanges ({ commit, state }) {
      commit('beginCommittingChanges')
      // alert('Save the following JSON to a file:\n' + JSON.stringify(state.stories))
      await sleep(500)
      commit('endCommittingChanges')
    }
  }
}
