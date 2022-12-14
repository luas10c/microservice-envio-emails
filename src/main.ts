import { Server, ServerCredentials, loadPackageDefinition } from '@grpc/grpc-js'
import { load } from '@grpc/proto-loader'
import { createTransport } from 'nodemailer'
import { resolve } from 'node:path'
import { CronJob } from 'cron'
import Queue from 'bull'

const emails = new Queue('emails', 'redis://0.0.0.0:6379')

const cron = new CronJob('*/2 * * * * *', async () => {
  await emails.clean(1)
  await emails.empty()
})

cron.start()

const transporter = createTransport({
  host: process.env.AMAZON_SES_HOST,
  port: Number(process.env.AMAZON_SES_PORT),
  auth: {
    user: process.env.AMAZON_SES_USER,
    pass: process.env.AMAZON_SES_PASS
  }
})

emails.process((job, done) => {
  transporter.sendMail(
    {
      from: 'luas10c@gmail.com',
      to: 'luas10c@gmail.com'
    },
    (error, info) => {
      if (error) {
        throw new Error(error.message)
      }

      done()
    }
  )
})

emails.on('completed', (job) => {
  console.log(`Job Complete! ${JSON.stringify(job.data)}`)
})

async function bootstrap() {
  const server = new Server()

  const UMBRELA_PROTO = resolve(__dirname, 'umbrela.proto')

  const packageDefinition = await load(UMBRELA_PROTO, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  })

  const proto = loadPackageDefinition(packageDefinition) as any

  server.addService(proto.UmbrellaService.service, {
    async sendMail(call, callback) {
      const { email, body } = call.request

      const { id, name, queue } = await emails.add({ email })

      return callback(null, { id, name, queue })
    }
  })

  server.bindAsync(
    '0.0.0.0:8844',
    ServerCredentials.createInsecure(),
    (error, port) => {
      if (error) {
        console.log(error)
        return
      }

      console.log(`Listening: http://localhost:${port}`)
      server.start()
    }
  )
}

bootstrap()
