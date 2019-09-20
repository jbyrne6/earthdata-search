import EventEmitter from 'events'
import $ from 'jquery'

const emitter = new EventEmitter()

emitter.on('error.global', (error = true) => {
  const { body } = document
  if (error) {
    $(body).addClass('body--has-error')
  } else {
    $(body).removeClass('body--has-error')
  }
})

// eslint-disable-next-line import/prefer-default-export
export const eventEmitter = emitter
