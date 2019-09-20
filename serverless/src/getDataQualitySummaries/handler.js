import 'array-foreach-async'
import request from 'request-promise'
import { getClientId, getEarthdataConfig } from '../../../sharedUtils/config'
import { cmrEnv } from '../../../sharedUtils/cmrEnv'
import { getJwtToken } from '../util/getJwtToken'
import { getEchoToken } from '../util/urs/getEchoToken'

/**
 * Retrieve data quality summaries for a given CMR Collection
 * @param {Object} event Details about the HTTP request that it received
 */
const getDataQualitySummaries = async (event) => {
  const { body } = event
  const { params = {} } = JSON.parse(body)

  const jwtToken = getJwtToken(event)

  const echoToken = await getEchoToken(jwtToken)

  const { echoRestRoot } = getEarthdataConfig(cmrEnv())

  const { catalog_item_id: catalogItemId } = params

  try {
    const dataQualitySummaries = []
    const errors = []

    const dqsAssociationResponse = await request.get({
      uri: `${echoRestRoot}/data_quality_summary_definitions.json`,
      qs: {
        catalog_item_id: catalogItemId
      },
      headers: {
        'Echo-Token': echoToken,
        'Client-Id': getClientId().background
      },
      json: true,
      resolveWithFullResponse: true
    })

    const { body } = dqsAssociationResponse

    // If there aren't any data quality summaries return a successful response with an empty body
    if (body.length === 0) {
      return {
        isBase64Encoded: false,
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify([])
      }
    }

    await body.forEachAsync(async (dqsAssociation) => {
      const { reference = {} } = dqsAssociation
      const { id: dqsId } = reference

      try {
        const dqsResponse = await request.get({
          uri: `${echoRestRoot}/data_quality_summary_definitions/${dqsId}.json`,
          headers: {
            'Echo-Token': echoToken,
            'Client-Id': getClientId().background
          },
          json: true,
          resolveWithFullResponse: true
        })

        const { body = {} } = dqsResponse
        const { data_quality_summary_definition: dataQualitySummary = {} } = body

        dataQualitySummaries.push(dataQualitySummary)
      } catch (e) {
        const { error } = e
        const { errors: echoRestErrors } = error
        const [errorMessage] = echoRestErrors

        errors.push(errorMessage)

        console.log(`Data Quality Summary retrieval error for ${catalogItemId}: ${errorMessage}`)
      }
    })

    console.log(`Data Quality Summaries found for ${catalogItemId}: ${JSON.stringify(dataQualitySummaries, null, 4)}`)

    if (dataQualitySummaries.length > 0) {
      return {
        isBase64Encoded: false,
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify(dataQualitySummaries)
      }
    }

    // If we've reached this point we expected to find data quality
    // summaries but didn't so we'll return a 404
    return {
      isBase64Encoded: false,
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({ errors })
    }
  } catch (e) {
    console.log(e)

    return {
      isBase64Encoded: false,
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ errors: [e] })
    }
  }
}

export default getDataQualitySummaries
