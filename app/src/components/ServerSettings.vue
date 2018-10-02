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
                        :class="{ 'is-invalid': errors.indexOf('port') > -1 }"
                        @keyup.native="cleanError('port')"
                        v-model="deploymentSettings.port" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('port') > -1"
                        class="note">
                        The port field cannot be empty.
                    </small>
                </field>

                <field
                    v-if="['ftp', 'ftp+tls', 'sftp', 'sftp+key'].indexOf(deploymentMethodSelected) > -1"
                    id="server"
                    label="Server">
                    <text-input
                        slot="field"
                        id="server"
                        key="server"
                        :class="{ 'is-invalid': errors.indexOf('server') > -1 }"
                        @keyup.native="cleanError('server')"
                        v-model="deploymentSettings.server" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('server') > -1"
                        class="note">
                        The server field cannot be empty.
                    </small>
                </field>

                <field
                    v-if="['ftp', 'ftp+tls', 'sftp', 'sftp+key'].indexOf(deploymentMethodSelected) > -1"
                    id="username"
                    label="Username">
                    <text-input
                        slot="field"
                        id="username"
                        key="username"
                        :class="{ 'is-invalid': errors.indexOf('username') > -1 }"
                        @keyup.native="cleanError('username')"
                        v-model="deploymentSettings.username" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('username') > -1"
                        class="note">
                        The username field cannot be empty.
                    </small>
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
                        :class="{ 'is-invalid': errors.indexOf('password') > -1 }"
                        @keyup.native="cleanError('password')"
                        v-model="deploymentSettings.password" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('username') > -1"
                        class="note">
                        The password field cannot be empty.
                    </small>
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
                        :class="{ 'is-invalid': errors.indexOf('key') > -1 }"
                        @click.native="cleanError('key')"
                        v-model="deploymentSettings.sftpkey"
                        key="sftpkey"
                        slot="field" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('key') > -1"
                        class="note">
                        Please select the key file
                    </small>
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
                        :class="{ 'is-invalid': errors.indexOf('github-user') > -1 }"
                        @keyup.native="cleanError('github-user')"
                        v-model="deploymentSettings.github.user" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('github-user') > -1"
                        class="note">
                        The username field cannot be empty
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'github-pages'"
                    id="gh-repo"
                    label="Repository">
                    <text-input
                        slot="field"
                        id="gh-repo"
                        key="gh-repo"
                        :class="{ 'is-invalid': errors.indexOf('github-repo') > -1 }"
                        @keyup.native="cleanError('github-repo')"
                        v-model="deploymentSettings.github.repo" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('github-repo') > -1"
                        class="note">
                        The repository field cannot be empty
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'github-pages'"
                    id="gh-branch"
                    label="Branch">
                    <text-input
                        slot="field"
                        id="gh-branch"
                        key="gh-branch"
                        :class="{ 'is-invalid': errors.indexOf('github-branch') > -1 }"
                        @keyup.native="cleanError('github-branch')"
                        v-model="deploymentSettings.github.branch" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('github-branch') > -1"
                        class="note">
                        The branch field cannot be empty
                    </small>
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
                        :class="{ 'is-invalid': errors.indexOf('github-token') > -1 }"
                        @keyup.native="cleanError('github-token')"
                        v-model="deploymentSettings.github.token" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('github-token') > -1"
                        class="note">
                        The token field cannot be empty
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'gitlab-pages'"
                    id="gl-server"
                    label="Server">
                    <text-input
                        slot="field"
                        id="gl-server"
                        key="gl-server"
                        :class="{ 'is-invalid': errors.indexOf('gitlab-server') > -1 }"
                        @keyup.native="cleanError('gitlab-server')"
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
                        :class="{ 'is-invalid': errors.indexOf('gitlab-repo') > -1 }"
                        @keyup.native="cleanError('gitlab-repo')"
                        v-model="deploymentSettings.gitlab.repo" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('gitlab-repo') > -1"
                        class="note">
                        The repository field cannot be empty
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'gitlab-pages'"
                    id="gl-branch"
                    label="Branch">
                    <text-input
                        slot="field"
                        id="gl-branch"
                        key="gl-branch"
                        :class="{ 'is-invalid': errors.indexOf('gitlab-branch') > -1 }"
                        @keyup.native="cleanError('gitlab-branch')"
                        v-model="deploymentSettings.gitlab.branch" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('gitlab-branch') > -1"
                        class="note">
                        The branch field cannot be empty
                    </small>
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
                        :class="{ 'is-invalid': errors.indexOf('gitlab-token') > -1 }"
                        @keyup.native="cleanError('gitlab-token')"
                        v-model="deploymentSettings.gitlab.token" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('gitlab-token') > -1"
                        class="note">
                        The token field cannot be empty
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'netlify'"
                    id="netlify-id"
                    label="Site ID">
                    <text-input
                        slot="field"
                        id="netlify-id"
                        key="netlify-id"
                        :class="{ 'is-invalid': errors.indexOf('netlify-id') > -1 }"
                        @keyup.native="cleanError('netlify-id')"
                        v-model="deploymentSettings.netlify.id" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('netlify-id') > -1"
                        class="note">
                        The Site ID field cannot be empty
                    </small>
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
                        :class="{ 'is-invalid': errors.indexOf('netlify-token') > -1 }"
                        @keyup.native="cleanError('netlify-token')"
                        v-model="deploymentSettings.netlify.token" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('netlify-token') > -1"
                        class="note">
                        The token field cannot be empty
                    </small>
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
                        :class="{ 'is-invalid': errors.indexOf('s3-id') > -1 }"
                        @keyup.native="cleanError('s3-id')"
                        v-model="deploymentSettings.s3.id" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('s3-id') > -1"
                        class="note">
                        The access ID field cannot be empty
                    </small>
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
                        :class="{ 'is-invalid': errors.indexOf('s3-key') > -1 }"
                        @keyup.native="cleanError('s3-key')"
                        v-model="deploymentSettings.s3.key" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('s3-key') > -1"
                        class="note">
                        The secret key field cannot be empty
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 's3'"
                    id="s3-bucket"
                    label="Bucket">
                    <text-input
                        slot="field"
                        id="s3-bucket"
                        key="s3-bucket"
                        :class="{ 'is-invalid': errors.indexOf('s3-bucket') > -1 }"
                        @keyup.native="cleanError('s3-bucket')"
                        v-model="deploymentSettings.s3.bucket" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('s3-bucket') > -1"
                        class="note">
                        The bucket field cannot be empty
                    </small>
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
                        :class="{ 'is-invalid': errors.indexOf('s3-region') > -1 }"
                        @click.native="cleanError('s3-region')"
                        v-model="deploymentSettings.s3.region"></dropdown>
                    <small
                        slot="note"
                        v-if="errors.indexOf('s3-region') > -1"
                        class="note">
                        The region selection cannot be empty
                    </small>
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
                    label="Your JSON key">
                    <file-select
                        id="google-key"
                        v-model="deploymentSettings.google.key"
                        key="google-key"
                        :class="{ 'is-invalid': errors.indexOf('google-key') > -1 }"
                        @click.native="cleanError('google-key')"
                        slot="field" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('google-key') > -1"
                        class="note">
                        The JSON key file selection cannot be empty
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'google-cloud'"
                    id="google-bucket"
                    label="Bucket">
                    <text-input
                        slot="field"
                        id="google-bucket"
                        key="google-bucket"
                        :class="{ 'is-invalid': errors.indexOf('google-bucket') > -1 }"
                        @keyup.native="cleanError('google-bucket')"
                        v-model="deploymentSettings.google.bucket" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('google-bucket') > -1"
                        class="note">
                        The bucket field cannot be empty
                    </small>
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
                        :class="{ 'is-invalid': errors.indexOf('manual-output') > -1 }"
                        @click.native="cleanError('manual-output')"
                        v-model="deploymentSettings.manual.output"></dropdown>

                    <small
                        slot="note"
                        v-if="errors.indexOf('manual-output') > -1"
                        class="note">
                        The manual output selection cannot be empty
                    </small>

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
            testInProgress: false,
            errors: []
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
                this.$bus.$emit('message-display', {
                    message: 'Please fill all required fields',
                    type: 'warning',
                    lifeTime: 3
                });

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
                this.$bus.$emit('message-display', {
                    message: 'Please fill all required fields',
                    type: 'warning',
                    lifeTime: 3
                });

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
            this.errors = [];

            switch (this.deploymentMethodSelected) {
                case 'ftp':
                case 'sftp':
                case 'sftp+key':
                case 'ftp+tls':
                    this.validateFtp();
                    break;
                case 's3':
                    this.validateS3();
                    break;
                case 'github-pages':
                    this.validateGithubPages();
                    break;
                case 'gitlab-pages':
                    this.validateGitlabPages();
                    break;
                case 'netlify':
                    this.validateNetlify();
                    break;
                case 'google-cloud':
                    this.validateGoogleCloud();
                    break;
                case 'manual':
                    this.validateManual();
                    break;
            }

            return !this.errors.length;
        },
        validateFtp () {
            if (this.deploymentSettings.port.trim() === '') {
                this.errors.push('port');
            }

            if (this.deploymentSettings.server.trim() === '') {
                this.errors.push('server');
            }

            if (this.deploymentSettings.username.trim() === '') {
                this.errors.push('username');
            }

            if (
                this.deploymentMethodSelected !== 'sftp+key' &&
                !this.deploymentSettings.askforpassword &&
                this.deploymentSettings.password.trim() === ''
            ) {
                this.errors.push('password');
            }

            if (
                this.deploymentMethodSelected === 'sftp+key' &&
                this.deploymentSettings.sftpkey.trim() === ''
            ) {
                this.errors.push('key');
            }
        },
        validateFields (fields) {
            for (let i = 0; i < fields.length; i++) {
                let field = fields[i].split('_');

                if (!this.deploymentSettings[field[0]][field[1]]) {
                    this.errors.push(fields[i].replace('_', '-'));
                } else if (this.deploymentSettings[field[0]][field[1]] && this.deploymentSettings[field[0]][field[1]].trim() === '') {
                    this.errors.push(fields[i].replace('_', '-'));
                }
            }
        },
        validateS3 () {
            let fields = ['s3_id', 's3_key', 's3_bucket', 's3_region'];
            return this.validateFields(fields);
        },
        validateGithubPages () {
            let fields = ['github_user', 'github_repo', 'github_branch', 'github_token'];
            return this.validateFields(fields);
        },
        validateGitlabPages () {
            let fields = ['gitlab_server', 'gitlab_repo', 'gitlab_branch', 'gitlab_token'];
            return this.validateFields(fields);
        },
        validateNetlify () {
            let fields = ['netlify_id', 'netlify_token'];
            return this.validateFields(fields);
        },
        validateGoogleCloud () {
            let fields = ['google_key', 'google_bucket'];
            return this.validateFields(fields);
        },
        validateManual () {
            let fields = ['manual_output'];
            return this.validateFields(fields);
        },
        visitWebsite () {
            if(!this.siteIsOnline) {
                return false;
            }

            shell.openExternal(this.$store.state.currentSite.config.domain);
        },
        cleanError (field) {
            let pos = this.errors.indexOf(field);

            if (pos !== -1) {
                this.errors.splice(pos, 1);
            }
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

    .is-invalid + .note {
        color: $color-3;
    }
}
</style>
