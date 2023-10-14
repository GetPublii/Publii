export default {
    protocol: '',
    port: '',
    server: '',
    username: '',
    password: '',
    askforpassword: '',
    passphrase: '',
    path: '',
    sftpkey: '',
    git: {
        url: '',
        branch: '',
        user: '',
        password: '',
        commitAuthor: '',
        commitEmail: '',
        commitMessage: 'Publii: update content'
    },
    github: {
        server: 'api.github.com',
        user: '',
        repo: '',
        branch: '',
        token: '',
        parallelOperations: 1,
        apiRateLimiting: 1
    },
    gitlab: {
        server: 'https://gitlab.com/',
        rejectUnauthorized: true,
        repo: '',
        branch: '',
        token: ''
    },
    google: {
        bucket: '',
        key: '',
        prefix: ''
    },
    manual: {
        output: 'catalog',
        outputDirectory: ''
    },
    netlify: {
        id: '',
        token: ''
    },
    s3: {
        customProvider: false,
        provider: 'aws',
        endpoint: '',
        id: '',
        key: '',
        bucket: '',
        region: '',
        prefix: '',
        acl: 'public-read'
    }
};
