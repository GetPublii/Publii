<template>
    <section
        class="content"
        ref="content">
        <div class="server-settings">
            <p-header title="Server Settings">
                <p-button
                    @click.native="visitWebsite"
                    slot="buttons"
                    :type="siteIsOnline ? 'outline' : 'outline disabled-with-events'"
                    :title="visitTitle">
                    Visit website
                </p-button>

                <p-button
                    :onClick="save"
                    slot="buttons">
                    Save Settings
                </p-button>
            </p-header>

            <fields-group title="Destination Server">
                <field
                    id="domain"
                    label="Domain">
                    <dropdown
                        slot="field"
                        id="http-protocol"
                        key="httpProtocol"
                        :items="httpProtocols"
                        v-model="httpProtocolSelected"></dropdown>

                    <text-input
                        slot="field"
                        id="domain"
                        key="domain"
                        v-model="domain" />
                </field>

                <field
                    id="deploymentMethod"
                    label="Protocol">
                    <dropdown
                        slot="field"
                        id="deploymentMethod"
                        key="protocol"
                        :items="deploymentMethods"
                        v-model="deploymentMethodSelected"></dropdown>

                    <small
                        class="note"
                        slot="note"
                        v-if="deploymentMethodSelected === 'ftp'">
                        The FTP protocol uses an unencrypted transmission.<br>
                        We strongly recommend to use FTPS or SFTP protocols if possible.
                    </small>

                    <small
                        class="note"
                        slot="note"
                        v-if="deploymentMethodSelected === 'netlify'">
                        Read how to <a href="https://getpublii.com/docs/build-a-static-website-with-netlify.html" target="_blank">configure Netlify website</a>.
                    </small>

                    <small
                        class="note"
                        slot="note"
                        v-if="deploymentMethodSelected === 'github-pages'">
                        Read how to <a href="https://getpublii.com/docs/host-static-website-github-pages.html" target="_blank">configure a Github Pages website</a>.
                    </small>

                    <small
                        class="note"
                        slot="note"
                        v-if="deploymentMethodSelected === 'gitlab-pages'">
                        Read how to <a href="https://getpublii.com/docs/host-static-website-gitlab-pages.html" target="_blank">configure a GitLab Pages website</a>.
                    </small>

                    <small
                        class="note"
                        slot="note"
                        v-if="deploymentMethodSelected === 's3'">
                        Read how to <a href="https://getpublii.com/docs/setup-static-website-hosting-amazon-s3.html" target="_blank">configure a S3 website</a>.
                    </small>

                    <small
                        class="note"
                        slot="note"
                        v-if="deploymentMethodSelected === 'google-cloud'">
                        Read how to <a href="https://getpublii.com/docs/make-static-website-google-cloud.html" target="_blank">configure a Google Cloud website</a>.
                    </small>
                </field>

                <field
                    v-if="['ftp', 'ftp+tls', 'sftp', 'sftp+key'].indexOf(deploymentMethodSelected) > -1"
                    id="port"
                    label="Port">
                    <text-input
                        slot="field"
                        id="port"
                        type="number"
                        key="port"
                        v-model="deploymentSettings.port" />
                </field>

                <field
                    v-if="['ftp', 'ftp+tls', 'sftp', 'sftp+key'].indexOf(deploymentMethodSelected) > -1"
                    id="server"
                    label="Server">
                    <text-input
                        slot="field"
                        id="server"
                        key="server"
                        v-model="deploymentSettings.server" />
                </field>

                <field
                    v-if="['ftp', 'ftp+tls', 'sftp', 'sftp+key'].indexOf(deploymentMethodSelected) > -1"
                    id="username"
                    label="Username">
                    <text-input
                        slot="field"
                        id="username"
                        key="username"
                        v-model="deploymentSettings.username" />
                </field>

                <field
                    v-if="['ftp', 'ftp+tls', 'sftp'].indexOf(deploymentMethodSelected) > -1 && !deploymentSettings.askforpassword"
                    id="password"
                    label="Password">
                    <text-input
                        slot="field"
                        id="password"
                        type="password"
                        key="password"
                        v-model="deploymentSettings.password" />
                </field>

                <field
                    v-if="['ftp', 'ftp+tls', 'sftp'].indexOf(deploymentMethodSelected) > -1"
                    id="askforpassword"
                    label="Always ask for password"
                    :labelSeparated="true">
                    <switcher
                        slot="field"
                        id="askforpassword"
                        key="askforpassword"
                        v-model="deploymentSettings.askforpassword" />
                    <template slot="second-label">
                        Require the FTP password on every time you sync your site
                    </template>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'sftp+key'"
                    id="sftpkey"
                    label="Your key">
                    <file-select
                        id="sftpkey"
                        v-model="deploymentSettings.sftpkey"
                        key="sftpkey"
                        slot="field" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 'sftp+key'"
                    id="passphrase"
                    label="Passphrase for a key">
                    <text-input
                        slot="field"
                        id="passphrase"
                        type="password"
                        key="passphrase"
                        v-model="deploymentSettings.passphrase" />

                    <small
                        slot="note"
                        class="note">
                        Use this field only if your key needs a passphrase
                    </small>
                </field>

                <field
                    v-if="['ftp', 'ftp+tls', 'sftp', 'sftp+key'].indexOf(deploymentMethodSelected) > -1"
                    id="path"
                    label="Remote path">
                    <text-input
                        slot="field"
                        id="path"
                        key="path"
                        v-model="deploymentSettings.path" />

                    <small
                        v-if="['ftp', 'ftp+tls'].indexOf(deploymentMethodSelected) > -1"
                        slot="note"
                        class="note">
                        Path should match your server root path e.g. /public_html/, /public_html/blog/
                    </small>

                    <small
                        v-if="['sftp', 'sftp+key'].indexOf(deploymentMethodSelected) > -1"
                        slot="note"
                        class="note">
                        Path should match your server path e.g. public_html/, public_html/blog/ or the root path e.g. /home/username/public_html/
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'github-pages'"
                    id="gh-user"
                    label="Username">
                    <text-input
                        slot="field"
                        id="gh-user"
                        key="gh-user"
                        v-model="deploymentSettings.github.user" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 'github-pages'"
                    id="gh-repo"
                    label="Repository">
                    <text-input
                        slot="field"
                        id="gh-repo"
                        key="gh-repo"
                        v-model="deploymentSettings.github.repo" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 'github-pages'"
                    id="gh-branch"
                    label="Branch">
                    <text-input
                        slot="field"
                        id="gh-branch"
                        key="gh-branch"
                        v-model="deploymentSettings.github.branch" />

                    <small
                        slot="note"
                        class="note">
                        Examples: <strong>gh-pages</strong>, <strong>docs</strong> or <strong>master</strong>
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'github-pages'"
                    id="gh-token"
                    label="Token">
                    <text-input
                        slot="field"
                        id="gh-token"
                        type="password"
                        key="gh-token"
                        v-model="deploymentSettings.github.token" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 'gitlab-pages'"
                    id="gl-server"
                    label="Server">
                    <text-input
                        slot="field"
                        id="gl-server"
                        key="gl-server"
                        v-model="deploymentSettings.gitlab.server" />
                    <small
                        slot="note"
                        class="note">
                        Change this value only if you are using your own GitLab instance.
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'gitlab-pages'"
                    id="gl-repo"
                    label="Repository">
                    <text-input
                        slot="field"
                        id="gl-repo"
                        key="gl-repo"
                        v-model="deploymentSettings.gitlab.repo" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 'gitlab-pages'"
                    id="gl-branch"
                    label="Branch">
                    <text-input
                        slot="field"
                        id="gl-branch"
                        key="gl-branch"
                        v-model="deploymentSettings.gitlab.branch" />

                    <small
                        slot="note"
                        class="note">
                        Examples: <strong>docs</strong> or <strong>master</strong>
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'gitlab-pages'"
                    id="gl-token"
                    label="Token">
                    <text-input
                        slot="field"
                        id="gl-token"
                        type="password"
                        key="gl-token"
                        v-model="deploymentSettings.gitlab.token" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 'netlify'"
                    id="netlify-id"
                    label="Site ID">
                    <text-input
                        slot="field"
                        id="netlify-id"
                        key="netlify-id"
                        v-model="deploymentSettings.netlify.id" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 'netlify'"
                    id="netlify-token"
                    label="Netlify token">
                    <text-input
                        slot="field"
                        id="netlify-token"
                        type="password"
                        key="netlify-token"
                        v-model="deploymentSettings.netlify.token" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 's3'"
                    id="s3-id"
                    label="Access ID">
                    <text-input
                        slot="field"
                        id="s3-id"
                        type="password"
                        key="s3-id"
                        v-model="deploymentSettings.s3.id" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 's3'"
                    id="s3-key"
                    label="Secret key">
                    <text-input
                        slot="field"
                        id="s3-key"
                        type="password"
                        key="s3-key"
                        v-model="deploymentSettings.s3.key" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 's3'"
                    id="s3-bucket"
                    label="Bucket">
                    <text-input
                        slot="field"
                        id="s3-bucket"
                        key="s3-bucket"
                        v-model="deploymentSettings.s3.bucket" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 's3'"
                    id="s3-region"
                    label="Region">
                    <dropdown
                        slot="field"
                        id="s3-region"
                        :items="s3Regions"
                        key="s3-region"
                        v-model="deploymentSettings.s3.region"></dropdown>
                </field>

                <field
                    v-if="deploymentMethodSelected === 's3'"
                    id="s3-prefix"
                    label="Prefix">
                    <text-input
                        slot="field"
                        id="s3-prefix"
                        key="s3-prefix"
                        v-model="deploymentSettings.s3.prefix" />

                    <small
                        slot="note"
                        class="note">
                        You can put your website in the subdirectory. Please avoid slash at the beginning (i.e. <strong>/blog/</strong>) - as it will create additional directory with the empty name. Proper prefix example: <strong>blog/</strong>.
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'google-cloud'"
                    id="google-key"
                    label="Your JSONkey">
                    <file-select
                        id="google-key"
                        v-model="deploymentSettings.google.key"
                        key="google-key"
                        slot="field" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 'google-cloud'"
                    id="google-bucket"
                    label="Bucket">
                    <text-input
                        slot="field"
                        id="google-bucket"
                        key="google-bucket"
                        v-model="deploymentSettings.google.bucket" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 'google-cloud'"
                    id="google-prefix"
                    label="Prefix">
                    <text-input
                        slot="field"
                        id="google-prefix"
                        key="google-prefix"
                        v-model="deploymentSettings.google.prefix" />

                    <small
                        slot="note"
                        class="note">
                        You can put your website in the subdirectory. Please avoid slash at the beginning (i.e. <strong>/blog/</strong>) - as it will create additional directory with the empty name. Proper prefix example: <strong>blog</strong>.
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'manual'"
                    id="manual-output"
                    label="Output type">
                    <dropdown
                        slot="field"
                        id="manual-output"
                        key="manual-output"
                        :items="{ '': 'Select output type', 'catalog': 'Non-compressed catalog', 'zip-archive': 'ZIP archive', 'tar-archive': 'TAR archive' }"
                        v-model="deploymentSettings.manual.output"></dropdown>

                    <small
                        slot="note"
                        class="note">
                        Publii will generate a catalog or ZIP/TAR archive with your website. Then you can upload these files to any destination server manually.
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'manual'"
                    id="manual-output-dir"
                    label="Output directory">
                    <dir-select
                        id="manual-output-dir"
                        v-model="deploymentSettings.manual.outputDirectory"
                        placeholder="Leave blank to use default output directory"
                        slot="field"
                        key="manual-output-dir" />

                    <small
                        v-if="deploymentSettings.manual.outputDirectory"
                        slot="note"
                        class="note">
                        <icon name="alert" size="m" />
                        Selected directory content will be removed during website generating
                    </small>
                </field>
            </fields-group>

            <p-footer>
                <p-button
                    :onClick="save"
                    slot="buttons">
                    Save Settings
                </p-button>

                <p-button
                    v-if="deploymentMethodSelected !== 'manual'"
                    :onClick="testConnection"
                    :disabled="testInProgress"
                    slot="buttons"
                    type="outline">
                    <template v-if="!testInProgress">Test connection</template>
                    <template v-if="testInProgress">Checking connection...</template>
                </p-button>
            </p-footer>
        </div>
    </section>
</template>

<script>
import { shell, ipcRenderer } from 'electron';
import ExternalLinks from './mixins/ExternalLinks';
import Utils from './../helpers/utils.js';
import defaultDeploymentSettings from './configs/defaultDeploymentSettings.js';
import s3RegionsList from './configs/s3Regions.js';

export default {
    name: 'server-settings',
    mixins: [
        ExternalLinks
    ],
    data () {
        return {
            domain: '',
            httpProtocols: {
                'http': 'http://',
                'https': 'https://'
            },
            httpProtocolSelected: '',
            deploymentMethods: {
                'github-pages': 'Github Pages',
                'gitlab-pages': 'GitLab Pages',
                'netlify': 'Netlify',
                's3': 'Amazon S3',
                'google-cloud': 'Google Cloud',
                'ftp': 'FTP',
                'sftp': 'SFTP (with password)',
                'sftp+key': 'SFTP (with key)',
                'ftp+tls': 'FTP with SSL/TLS',
                'manual': 'Manual upload'
            },
            deploymentMethodSelected: '',
            deploymentSettings: defaultDeploymentSettings,
            s3Regions: s3RegionsList,
            testInProgress: false
        };
    },
    computed: {
        currentDomain () {
            return this.$store.state.currentSite.config.domain.replace('http://', '').replace('https://', '');
        },
        currentHttpProtocol () {
            return this.$store.state.currentSite.config.domain.indexOf('https') === 0 ? 'https' : 'http';
        },
        siteIsOnline () {
            if(
                !this.$store.state.currentSite.config.domain ||
                this.$store.state.currentSite.config.deployment.protocol === 'manual'
            ) {
                return false;
            }

            return !!this.$store.state.currentSite.config.syncDate;
        },
        visitTitle () {
            if(this.siteIsOnline) {
                return 'Visit your website';
            } else {
                return 'After the initial sync, your website will be available online';
            }
        }
    },
    watch: {
        deploymentMethodSelected: function (newValue) {
            setTimeout(() => {
                this.setPortValue();
            }, 0);
        }
    },
    mounted () {
        this.domain = this.currentDomain;
        this.httpProtocolSelected = this.currentHttpProtocol;
        this.deploymentMethodSelected = this.$store.state.currentSite.config.deployment.protocol || 'github-pages';
        this.deploymentSettings = Utils.deepMerge(this.deploymentSettings, JSON.parse(JSON.stringify(this.$store.state.currentSite.config.deployment)));

        setTimeout(() => {
            this.setPortValue();
        }, 0);
    },
    methods: {
        setPortValue () {
            if (['', '21', '22', '990'].indexOf(this.deploymentSettings.port) === -1) {
                return;
            }

            switch(this.deploymentMethodSelected) {
                case 'sftp':
                case 'sftp+key':
                    this.deploymentSettings.port = '22'; break;
                case 'ftp+implicit+tls':
                    this.deploymentSettings.port = '990'; break;
                case 's3':
                case 'github-pages':
                case 'gitlab-pages':
                case 'netlify':
                case 'google-cloud':
                case 'manual':
                    this.deploymentSettings.port = ''; break;
                case 'ftp':
                case 'ftp+tls':
                default:
                    this.deploymentSettings.port = '21';
            }
        },
        prepareDomain () {
            return this.domain.replace('http://', '').replace('https://', '').replace(/\/$/, '');
        },
        fullDomainName () {
            let domain = this.prepareDomain();

            if(this.deploymentMethodSelected === 'github-pages') {
                if(domain.indexOf('github.io') > -1) {
                    this.httpProtocolSelected = 'https';
                }
            }

            if(this.deploymentMethodSelected === 'gitlab-pages') {
                if(domain.indexOf('gitlab.io') > -1) {
                    this.httpProtocolSelected = 'https';
                }
            }

            return this.httpProtocolSelected + '://' + domain;
        },
        save () {
            if(!this.validate()) {
                return;
            }

            let newSettings = this.getDeploymentSettings();

            ipcRenderer.send('app-site-config-save', {
                "site": this.$store.state.currentSite.config.name,
                "settings": newSettings
            });

            ipcRenderer.once('app-site-config-saved', (event, data) => {
                if(data.status === true) {
                    this.saved(newSettings);
                }

                if(data.message === 'success-save') {
                    this.$bus.$emit('message-display', {
                        message: 'Server settings has been successfully saved.',
                        type: 'success',
                        lifeTime: 3
                    });
                }
            });
        },
        saved (newSettings) {
            this.$store.commit('setSiteConfig', {
                name: this.$store.state.currentSite.config.name,
                config: newSettings
            });
        },
        getDeploymentSettings () {
            let newSettings = {
                domain: this.fullDomainName().trim(),
                deployment: Object.assign({}, defaultDeploymentSettings)
            };
            newSettings.deployment = Object.assign({}, newSettings.deployment, this.deploymentSettings);
            newSettings.deployment.protocol = this.deploymentMethodSelected;
            let currentSiteConfigCopy = JSON.parse(JSON.stringify(this.$store.state.currentSite.config));
            return Utils.deepMerge(currentSiteConfigCopy, newSettings);
        },
        testConnection () {
            if(['ftp', 'sftp', 'sftp+key', 'ftp+tls'].indexOf(this.deploymentMethodSelected) > -1 && this.deploymentSettings.askforpassword) {
                this.$bus.$emit('confirm-display', {
                    hasInput: true,
                    inputIsPassword: true,
                    message: 'Please provide FTP password for ' + this.$refs['server'].getValue(),
                    okClick: (password) => {
                        if(!password) {
                            this.$bus.$emit('alert-display', {
                                message: 'Without password you cannot test connection. Please try again'
                            });
                        } else {
                            this.test(password);
                        }
                    }
                });
            } else {
                this.test();
            }
        },
        test (password = false) {
            if(!this.validate()) {
                return;
            }

            this.save();

            let deploymentSettings = this.getDeploymentSettings().deployment;

            if(password) {
                deploymentSettings.password = password;
            }

            this.testInProgress = true;

            ipcRenderer.send('app-deploy-test', {
                siteName: this.$store.state.currentSite.config.name,
                deploymentConfig: deploymentSettings
            });

            ipcRenderer.once('app-deploy-test-success', (event, data) => {
                this.$bus.$emit('alert-display', {
                    message: 'Success! Application was able to connect with your server.',
                    buttonStyle: 'success'
                });

                this.testInProgress = false;
            });

            ipcRenderer.once('app-deploy-test-error', (event, data) => {
                if(data && data.message) {
                    this.$bus.$emit('alert-display', {
                        message: 'Error! Application was unable to connect with your server: ' + data.message,
                        buttonStyle: 'danger'
                    });
                } else {
                    this.$bus.$emit('alert-display', {
                        message: 'Error! Application was unable to connect with your server.',
                        buttonStyle: 'danger'
                    });
                }

                this.testInProgress = false;
            });
        },
        validate () {
            switch (this.deploymentMethodSelected) {
                case 'ftp':
                case 'sftp':
                case 'sftp+key':
                case 'ftp+tls':
                    return this.validateFtp();
                case 's3':
                    return this.validateS3();
                case 'github-pages':
                    return this.validateGithubPages();
                case 'gitlab-pages':
                    return this.validateGitlabPages();
                case 'netlify':
                    return this.validateNetlify();
                case 'google-cloud':
                    return this.validateGoogleCloud();
                case 'manual':
                    return this.validateManual();
            }

            return false;
        },
        validateFtp () {
            if (this.deploymentSettings.port.trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The port field cannot be empty.' });
                return false;
            }

            if (isNaN(this.deploymentSettings.port)) {
                this.$bus.$emit('alert-display', { 'message': 'The port field value must be a number.' });
                return false;
            }

            if (this.deploymentSettings.server.trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The server field cannot be empty.' });
                return false;
            }

            if (this.deploymentSettings.username.trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The username field cannot be empty.' });
                return false;
            }

            if (
                this.deploymentMethodSelected !== 'sftp+key' &&
                !this.deploymentSettings.askforpassword &&
                this.deploymentSettings.password.trim() === ''
            ) {
                this.$bus.$emit('alert-display', { 'message': 'The password field cannot be empty.' });
                return false;
            }

            if (
                this.deploymentMethodSelected === 'sftp+key' &&
                this.deploymentSettings.sftpkey.trim() === ''
            ) {
                this.$bus.$emit('alert-display', { 'message': 'Please select the key file.' });
                return false;
            }

            return true;
        },
        validateFields (messages) {
            let fields = Object.keys(messages);

            for (let i = 0; i < fields.length; i++) {
                if(this.deploymentSettings[fields[i]] && this.deploymentSettings[fields[i]].trim() === '') {
                    this.$bus.$emit('alert-display', { 'message': messages[fields[i]] });
                    return false;
                }
            }

            return true;
        },
        validateS3 () {
            let messages = {
                's3_id': 'The access ID field cannot be empty.',
                's3_key': 'The secret key field cannot be empty.',
                's3_bucket': 'The bucket field cannot be empty.',
                's3_region': 'The region selection cannot be empty.'
            };

            return this.validateFields(messages);
        },
        validateGithubPages () {
            let messages = {
                'github_user': 'The username field cannot be empty.',
                'github_repo': 'The repository field cannot be empty.',
                'github_branch': 'The branch field cannot be empty.',
                'github_token': 'The token field cannot be empty.'
            };

            return this.validateFields(messages);
        },
        validateGitlabPages () {
            let messages = {
                'gitlab_server': 'The server field cannot be empty.',
                'gitlab_repo': 'The repository field cannot be empty.',
                'gitlab_branch': 'The branch field cannot be empty.',
                'gitlab_token': 'The token field cannot be empty.'
            };

            return this.validateFields(messages);
        },
        validateNetlify () {
            let messages = {
                'netlify_id': 'The Site ID field cannot be empty.',
                'netlify_token': 'The token field cannot be empty.'
            };

            return this.validateFields(messages);
        },
        validateGoogleCloud () {
            let messages = {
                'google_key': 'The JSON key field cannot be empty.',
                'google_bucket': 'The bucket field cannot be empty.'
            };

            return this.validateFields(messages);
        },
        validateManual () {
            let messages = {
                'manual_output': 'The output type selection cannot be empty.'
            };

            return this.validateFields(messages);
        },
        visitWebsite () {
            if(!this.siteIsOnline) {
                return false;
            }

            shell.openExternal(this.$store.state.currentSite.config.domain);
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.server-settings {
    margin: 0 auto;
    max-width: 960px;

    #http-protocol {
        float: left;
        width: 110px;

        & + .input-wrapper {
            float: right;
            width: calc(100% - 120px);
        }
    }
}
</style>
