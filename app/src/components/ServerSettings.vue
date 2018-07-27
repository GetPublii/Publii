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
                        ref="httpProtocol"
                        key="httpProtocol"
                        :items="httpProtocols"
                        :selected="httpProtocolSelected"></dropdown>

                    <text-input
                        slot="field"
                        ref="domain"
                        id="domain"
                        key="domain"
                        :value="domain" />
                </field>

                <field
                    id="deploymentMethod"
                    label="Protocol">
                    <dropdown
                        slot="field"
                        id="deploymentMethod"
                        ref="protocol"
                        key="protocol"
                        :onChange="deploymentMethodChanged"
                        :items="deploymentMethods"
                        :selected="deploymentMethodSelected"></dropdown>

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
                        ref="port"
                        id="port"
                        type="number"
                        key="port"
                        :value="deploymentSettings.port" />
                </field>

                <field
                    v-if="['ftp', 'ftp+tls', 'sftp', 'sftp+key'].indexOf(deploymentMethodSelected) > -1"
                    id="server"
                    label="Server">
                    <text-input
                        slot="field"
                        ref="server"
                        id="server"
                        key="server"
                        :value="deploymentSettings.server" />
                </field>

                <field
                    v-if="['ftp', 'ftp+tls', 'sftp', 'sftp+key'].indexOf(deploymentMethodSelected) > -1"
                    id="username"
                    label="Username">
                    <text-input
                        slot="field"
                        ref="username"
                        id="username"
                        key="username"
                        :value="deploymentSettings.username" />
                </field>

                <field
                    v-if="['ftp', 'ftp+tls', 'sftp'].indexOf(deploymentMethodSelected) > -1 && !deploymentSettings.askforpassword"
                    id="password"
                    label="Password">
                    <text-input
                        slot="field"
                        ref="password"
                        id="password"
                        type="password"
                        key="password"
                        :value="deploymentSettings.password" />
                </field>

                <field
                    v-if="['ftp', 'ftp+tls', 'sftp'].indexOf(deploymentMethodSelected) > -1"
                    id="askforpassword"
                    label="Always ask for password"
                    :labelSeparated="true">
                    <switcher
                        slot="field"
                        id="askforpassword"
                        ref="askforpassword"
                        key="askforpassword"
                        :checked="deploymentSettings.askforpassword"
                        :onToggle="toggleAskForPassword" />
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
                        :value="deploymentSettings.sftpkey"
                        ref="sftpkey"
                        key="sftpkey"
                        slot="field" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 'sftp+key'"
                    id="passphrase"
                    label="Passphrase for a key">
                    <text-input
                        slot="field"
                        ref="passphrase"
                        id="passphrase"
                        type="password"
                        key="passphrase"
                        :value="deploymentSettings.passphrase" />

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
                        ref="path"
                        id="path"
                        key="path"
                        :value="deploymentSettings.path" />

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
                        ref="github_user"
                        id="gh-user"
                        key="gh-user"
                        :value="deploymentSettings.github.user" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 'github-pages'"
                    id="gh-repo"
                    label="Repository">
                    <text-input
                        slot="field"
                        ref="github_repo"
                        id="gh-repo"
                        key="gh-repo"
                        :value="deploymentSettings.github.repo" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 'github-pages'"
                    id="gh-branch"
                    label="Branch">
                    <text-input
                        slot="field"
                        ref="github_branch"
                        id="gh-branch"
                        key="gh-branch"
                        :value="deploymentSettings.github.branch" />

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
                        ref="github_token"
                        id="gh-token"
                        type="password"
                        key="gh-token"
                        :value="deploymentSettings.github.token" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 'gitlab-pages'"
                    id="gl-server"
                    label="Server">
                    <text-input
                        slot="field"
                        ref="gitlab_server"
                        id="gl-server"
                        key="gl-server"
                        :value="deploymentSettings.gitlab.server" />
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
                        ref="gitlab_repo"
                        id="gl-repo"
                        key="gl-repo"
                        :value="deploymentSettings.gitlab.repo" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 'gitlab-pages'"
                    id="gl-branch"
                    label="Branch">
                    <text-input
                        slot="field"
                        ref="gitlab_branch"
                        id="gl-branch"
                        key="gl-branch"
                        :value="deploymentSettings.gitlab.branch" />

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
                        ref="gitlab_token"
                        id="gl-token"
                        type="password"
                        key="gl-token"
                        :value="deploymentSettings.gitlab.token" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 'netlify'"
                    id="netlify-id"
                    label="Site ID">
                    <text-input
                        slot="field"
                        ref="netlify_id"
                        id="netlify-id"
                        key="netlify-id"
                        :value="deploymentSettings.netlify.id" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 'netlify'"
                    id="netlify-token"
                    label="Netlify token">
                    <text-input
                        slot="field"
                        ref="netlify_token"
                        id="netlify-token"
                        type="password"
                        key="netlify-token"
                        :value="deploymentSettings.netlify.token" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 's3'"
                    id="s3-id"
                    label="Access ID">
                    <text-input
                        slot="field"
                        ref="s3_id"
                        id="s3-id"
                        type="password"
                        key="s3-id"
                        :value="deploymentSettings.s3.id" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 's3'"
                    id="s3-key"
                    label="Secret key">
                    <text-input
                        slot="field"
                        ref="s3_key"
                        id="s3-key"
                        type="password"
                        key="s3-key"
                        :value="deploymentSettings.s3.key" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 's3'"
                    id="s3-bucket"
                    label="Bucket">
                    <text-input
                        slot="field"
                        ref="s3_bucket"
                        id="s3-bucket"
                        key="s3-bucket"
                        :value="deploymentSettings.s3.bucket" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 's3'"
                    id="s3-region"
                    label="Region">
                    <dropdown
                        slot="field"
                        id="s3-region"
                        ref="s3_region"
                        :items="s3Regions"
                        key="s3-region"
                        :selected="deploymentSettings.s3.region"></dropdown>
                </field>

                <field
                    v-if="deploymentMethodSelected === 's3'"
                    id="s3-prefix"
                    label="Prefix">
                    <text-input
                        slot="field"
                        ref="s3_prefix"
                        id="s3-prefix"
                        key="s3-prefix"
                        :value="deploymentSettings.s3.prefix" />

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
                        :value="deploymentSettings.google.key"
                        ref="google_key"
                        key="google-key"
                        slot="field" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 'google-cloud'"
                    id="google-bucket"
                    label="Bucket">
                    <text-input
                        slot="field"
                        ref="google_bucket"
                        id="google-bucket"
                        key="google-bucket"
                        :value="deploymentSettings.google.bucket" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 'google-cloud'"
                    id="google-prefix"
                    label="Prefix">
                    <text-input
                        slot="field"
                        ref="google_prefix"
                        id="google-prefix"
                        key="google-prefix"
                        :value="deploymentSettings.google.prefix" />

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
                        ref="manual_output"
                        key="manual-output"
                        :items="{ '': 'Select output type', 'catalog': 'Non-compressed catalog', 'zip-archive': 'ZIP archive', 'tar-archive': 'TAR archive' }"
                        :selected="deploymentSettings.manual.output"></dropdown>

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
                        :value="deploymentSettings.manual.outputDirectory"
                        ref="manual_outputDirectory"
                        placeholder="Leave blank to use default output directory"
                        slot="field"
                        key="manual-output-dir"
                        :onChange="manualOutputDirectorySelected" />

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
    data: function() {
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
        currentDeploymentMethod () {
            return this.$store.state.currentSite.config.deployment.protocol;
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
    mounted: function() {
        this.domain = this.currentDomain;
        this.httpProtocolSelected = this.currentHttpProtocol;
        this.deploymentMethodSelected = this.currentDeploymentMethod || 'github-pages';
        this.deploymentSettings = Utils.deepMerge(this.deploymentSettings, JSON.parse(JSON.stringify(this.$store.state.currentSite.config.deployment)));

        setTimeout(() => {
            this.setPortValue();
        }, 0);
    },
    methods: {
        deploymentMethodChanged: function(newValue) {
            this.deploymentMethodSelected = newValue;

            setTimeout(() => {
                this.setPortValue();
            }, 0);
        },
        toggleAskForPassword: function(newValue) {
            this.deploymentSettings.askforpassword = newValue;
        },
        setPortValue: function() {
            if(!this.$refs['port']) {
                return;
            }

            let portValue = this.deploymentSettings.port;

            if(['', '21', '22', '990'].indexOf(portValue) > -1) {
                portValue = '21';

                switch(this.deploymentMethodSelected) {
                    case 'ftp': portValue = '21'; break;
                    case 'sftp': portValue = '22'; break;
                    case 'sftp+key': portValue = '22'; break;
                    case 'ftp+tls': portValue = '21'; break;
                    case 'ftp+implicit+tls': portValue = '990'; break;
                    case 's3': portValue = ''; break;
                    case 'github-pages': portValue = ''; break;
                    case 'gitlab-pages': portValue = ''; break;
                    case 'netlify': portValue = ''; break;
                    case 'google-cloud': portValue = ''; break;
                    case 'manual': portValue = ''; break;
                    default: portValue = '21';
                }
            }

            this.deploymentSettings.port = portValue;
            this.$refs['port'].content = portValue;
        },
        manualOutputDirectorySelected: function(newValue) {
            this.deploymentSettings.manual.outputDirectory = newValue;
        },
        prepareDomain: function() {
            return this.$refs['domain'].getValue()
                    .replace('http://', '')
                    .replace('https://', '')
                    .replace(/\/$/, '');
        },
        fullDomainName: function() {
            let httpProtocol = this.$refs['httpProtocol'].getValue();
            let domain = this.prepareDomain();

            if(this.deploymentMethodSelected === 'github-pages') {
                if(domain.indexOf('github.io') > -1) {
                    httpProtocol = 'https';
                    this.httpProtocolSelected = 'https';
                }
            }

            if(this.deploymentMethodSelected === 'gitlab-pages') {
                if(domain.indexOf('gitlab.io') > -1) {
                    httpProtocol = 'https';
                    this.httpProtocolSelected = 'https';
                }
            }

            return httpProtocol + '://' + domain;
        },
        save: function() {
            if(!this.validate()) {
                return;
            }

            let newSettings = this.getDeploymentSettings();

            // Send request to the back-end
            ipcRenderer.send('app-site-config-save', {
                "site": this.$store.state.currentSite.config.name,
                "settings": newSettings
            });

            // Settings saved
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
        saved: function(newSettings) {
            this.$store.commit('setSiteConfig', {
                name: this.$store.state.currentSite.config.name,
                config: newSettings
            });
        },
        getDeploymentSettings: function() {
            let excludedRefs = ['content', 'httpProtocol', 'domain'];
            let availableRefs = Object.keys(this.$refs);
            let newSettings = {
                domain: this.fullDomainName(),
                deployment: Object.assign({}, defaultDeploymentSettings)
            };
            let currentProtocol = this.$refs['protocol'].getValue();

            if(currentProtocol === 'github-pages') {
                currentProtocol = 'github';
            }

            if(currentProtocol === 'gitlab-pages') {
                currentProtocol = 'gitlab';
            }

            if(currentProtocol === 'google-cloud') {
                currentProtocol = 'google';
            }

            for(let ref of availableRefs) {
                if(excludedRefs.indexOf(ref) > -1) {
                    continue;
                }

                if(ref === 'password' && this.$refs['askforpassword'] && this.$refs['askforpassword'].getValue()) {
                    continue;
                }

                if(ref.indexOf('_') > -1) {
                    let refParts = ref.split('_');

                    if(refParts[0] === currentProtocol) {
                        this.deploymentSettings[refParts[0]][refParts[1]] = this.$refs[ref].getValue();
                    }
                } else if(this.$refs[ref]) {
                    this.deploymentSettings[ref] = this.$refs[ref].getValue();
                }
            }

            newSettings.deployment = Object.assign({}, newSettings.deployment, this.deploymentSettings);
            let currentSiteConfigCopy = JSON.parse(JSON.stringify(this.$store.state.currentSite.config));
            newSettings = Utils.deepMerge(currentSiteConfigCopy, newSettings);

            return newSettings;
        },
        testConnection: function() {
            if(['ftp', 'sftp', 'sftp+key', 'ftp+tls'].indexOf(this.deploymentMethodSelected) > -1 && this.$refs['askforpassword'].getValue()) {
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
        test: function(password = false) {
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
        validate: function() {
            if(['ftp', 'sftp', 'sftp+key', 'ftp+tls'].indexOf(this.deploymentMethodSelected) > -1) {
                return this.validateFtp();
            }

            if(this.deploymentMethodSelected === 's3') {
                return this.validateS3();
            }

            if(this.deploymentMethodSelected === 'github-pages') {
                return this.validateGithubPages();
            }

            if(this.deploymentMethodSelected === 'gitlab-pages') {
                return this.validateGitlabPages();
            }

            if(this.deploymentMethodSelected === 'netlify') {
                return this.validateNetlify();
            }

            if(this.deploymentMethodSelected === 'google-cloud') {
                return this.validateGoogleCloud();
            }

            if(this.deploymentMethodSelected === 'manual') {
                return this.validateManual();
            }

            return false;
        },
        validateFtp: function() {
            if(this.$refs['port'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The port field cannot be empty.' });
                return false;
            }

            if(isNaN(this.$refs['port'].getValue())) {
                this.$bus.$emit('alert-display', { 'message': 'The port field value must be a number.' });
                return false;
            }

            if(this.$refs['server'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The server field cannot be empty.' });
                return false;
            }

            if(this.$refs['username'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The username field cannot be empty.' });
                return false;
            }

            if(this.deploymentMethodSelected !== 'sftp+key' && !this.$refs['askforpassword'].getValue() && this.$refs['password'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The password field cannot be empty.' });
                return false;
            }

            if(this.deploymentMethodSelected === 'sftp+key' && this.$refs['sftpkey'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'Please select the key file.' });
                return false;
            }

            return true;
        },
        validateS3: function() {
            if(this.$refs['s3_id'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The access ID field cannot be empty.' });
                return false;
            }

            if(this.$refs['s3_key'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The secret key field cannot be empty.' });
                return false;
            }

            if(this.$refs['s3_bucket'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The bucket field cannot be empty.' });
                return false;
            }

            if(this.$refs['s3_region'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The region selection cannot be empty.' });
                return false;
            }

            return true;
        },
        validateGithubPages: function() {
            if(this.$refs['github_user'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The username field cannot be empty.' });
                return false;
            }

            if(this.$refs['github_repo'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The repository field cannot be empty.' });
                return false;
            }

            if(this.$refs['github_branch'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The branch field cannot be empty.' });
                return false;
            }

            if(this.$refs['github_token'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The token field cannot be empty.' });
                return false;
            }

            return true;
        },
        validateGitlabPages: function() {
            if(this.$refs['gitlab_server'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The server field cannot be empty.' });
                return false;
            }

            if(this.$refs['gitlab_repo'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The repository field cannot be empty.' });
                return false;
            }

            if(this.$refs['gitlab_branch'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The branch field cannot be empty.' });
                return false;
            }

            if(this.$refs['gitlab_token'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The token field cannot be empty.' });
                return false;
            }

            return true;
        },
        validateNetlify: function() {
            if(this.$refs['netlify_id'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The Site ID field cannot be empty.' });
                return false;
            }

            if(this.$refs['netlify_token'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The token field cannot be empty.' });
                return false;
            }

            return true;
        },
        validateGoogleCloud: function() {
            if(this.$refs['google_key'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The JSON key field cannot be empty.' });
                return false;
            }

            if(this.$refs['google_bucket'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The bucket field cannot be empty.' });
                return false;
            }

            return true;
        },
        validateManual: function() {
            if(this.$refs['manual_output'].getValue().trim() === '') {
                this.$bus.$emit('alert-display', { 'message': 'The output type selection cannot be empty.' });
                return false;
            }

            return true;
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
