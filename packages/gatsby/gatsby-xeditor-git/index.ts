import * as express from 'express'
import * as fs from 'fs'
import * as path from 'path'
import * as openRepo from 'simple-git/promise'
import { audit } from './audit'
import { writeFile } from './file-writer'

const GIT_SSH_COMMAND =
  'ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no'

const DEFAULT_NAME = 'Forestry'
const DEFAULT_EMAIL = 'nolan@forestry.io'
const DEFAULT_MESSAGE = 'Update from XEditor'

exports.extendXserver = (server: any, config: any) => {
  let pathRoot = process.cwd()

  const repo = openRepo(pathRoot)
  // TODO: Don't do this
  repo.env('GIT_SSH_COMMAND', GIT_SSH_COMMAND)
  server.use(express.json())

  server.post(`${config.routePrefix}/commit`, (req: any, res: any) => {
    let message = req.body.message
    let files = req.body.files.map((rel: string) => path.join(pathRoot, rel))
    // TODO: Separate commit and push???
    commit({
      name: req.body.name,
      email: req.body.email,
      message,
      files,
    })
      .then(() => {
        res.json({ status: 'success' })
      })
      .catch(e => {
        // TODO: More intelligently respond
        res.status(412)
        res.send(e.message)
      })
  })

  interface CommitOptions {
    files: string[]
    message?: string
    name?: string
    email?: string
  }
  async function commit({ files, message, name, email }: CommitOptions) {
    let options = {
      '--author': `"${name || DEFAULT_NAME} <${email || DEFAULT_EMAIL}>"`,
    }

    await repo.commit(message || DEFAULT_MESSAGE, ...files, options)
    await repo.push()
  }

  server.put(`${config.routePrefix}/markdownRemark`, (req: any, res: any) => {
    writeFile(pathRoot, req.body)
    res.send(req.body.content)
  })
}

let writeFileAudit = audit((pathRoot: string, body: any) => {
  let filePath = path.join(pathRoot, body.fileRelativePath)
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, body.content, err => {
      if (err) reject(err)
      else resolve()
    })
  })
})
