<template>
    <section
        class="content"
        ref="content">
        <div
            v-if="isLoaded"
            class="server-settings">
            <p-header
                v-if="deploymentMethodSelected !== ''"
                :title="getDeploymentMethodName(deploymentMethodSelected)">
                <p-button
                    @click.native="deploymentMethodSelected = ''"
                    slot="buttons"
                    :title="$t('sync.clickToChangeDeploymentMethod')"
                    type="clean back">
                    {{ $t('sync.changeServerType') }}
                </p-button>

                <p-button
                    @click.native="visitWebsite"
                    slot="buttons"
                    :type="siteIsOnline ? 'outline' : 'outline disabled-with-events'"
                    :title="visitTitle">
                    {{ $t('sync.visitWebsite') }}
                </p-button>

                <p-button
                    :onClick="save"
                    slot="buttons">
                    {{ $t('settings.saveSettings') }}
                </p-button>
            </p-header>

            <p-header
                v-if="deploymentMethodSelected === ''"
                :title="$t('sync.selectServerType')">
            </p-header>

            <div
                v-if="deploymentMethodSelected === ''"
                class="msg msg-icon msg-info msg-onbg">
                <icon name="info" customWidth="28" customHeight="28" />
                <p v-pure-html="$t('settings.readAboutOurRecommendedServerSettings')"></p>
            </div>

            <div
                v-if="deploymentMethodSelected === ''"
                class="server-settings-grid">

                 <div
                    @click="deploymentMethodSelected = 'ftp'"
                    :title="$t('sync.ftp')"
                    class="server-settings-grid-item">
                   <icon
                      customWidth="48"
                      customHeight="48"
                      name="ftp"
                      iconset="svg-map-server"/>
                      <span>{{ $t('sync.ftp') }}</span>
                </div>

                <div
                    @click="deploymentMethodSelected = 'sftp'"
                    :title="$t('sync.sftp')"
                    class="server-settings-grid-item">
                   <icon
                      customWidth="48"
                      customHeight="48"
                      name="sftp"
                      iconset="svg-map-server"/>
                      <span>{{ $t('sync.sftp') }}</span>
                </div>

                <div
                    @click="deploymentMethodSelected = 's3'"
                    :title="$t('sync.s3CompatibleStorage')"
                    class="server-settings-grid-item">
                   <icon
                      customWidth="48"
                      customHeight="48"
                      name="s3storage"
                      iconset="svg-map-server"/>
                      <span>{{ $t('sync.s3CompatibleStorage') }}</span>
                </div>

                <div
                    @click="deploymentMethodSelected = 'git'"
                    :title="$t('sync.git')"
                    class="server-settings-grid-item">
                    <icon
                      customWidth="84"
                      customHeight="48"
                      name="git"
                      iconset="svg-map-server"/>
                      <span>{{ $t('sync.git') }}</span>
                </div>
                
                <div
                    @click="deploymentMethodSelected = 'github-pages'"
                    :title="$t('sync.github')"
                    class="server-settings-grid-item">
                    <icon
                      customWidth="48"
                      customHeight="48"
                      name="githubpages"
                      iconset="svg-map-server"/>
                      <span>{{ $t('sync.githubPages') }}</span>
                </div>

                <div
                    @click="deploymentMethodSelected = 'gitlab-pages'"
                    :title="$t('sync.gitlabPages')"
                    class="server-settings-grid-item">
                    <icon
                      customWidth="48"
                      customHeight="48"
                      name="gitlab"
                      iconset="svg-map-server"/>
                      <span>{{ $t('sync.gitlabPages') }}</span>
                </div>

                <div
                    @click="deploymentMethodSelected = 'netlify'"
                    :title="$t('sync.netlify')"
                    class="server-settings-grid-item">
                   <icon
                      customWidth="54"
                      customHeight="48"
                      name="netlify"
                      iconset="svg-map-server"/>
                      <span>{{ $t('sync.netlify') }}</span>
                </div>

                <div
                    @click="deploymentMethodSelected = 'google-cloud'"
                    :title="$t('sync.googleCloud')"
                    class="server-settings-grid-item">
                    <icon
                      customWidth="48"
                      customHeight="48"
                      name="googlecloud"
                      iconset="svg-map-server"/>
                      <span>{{ $t('sync.googleCloud') }}</span>
                </div>

                <div
                    @click="deploymentMethodSelected = 'manual'"
                    :title="$t('sync.manualDeployment')"
                    class="server-settings-grid-item">
                   <icon
                      customWidth="48"
                      customHeight="48"
                      name="zip"
                      iconset="svg-map-server"/>
                      <span>{{ $t('sync.manualDeployment') }}</span>
                </div>

                <a
                    href="https://getpublii.com/docs/deployment/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="server-settings-grid-item deployment-others">

                    <icon
                        customWidth="50"
                        customHeight="46"
                        properties="not-clickable"
                        name="add" />

                    <h3>{{ $t('ui.more') }}...</h3>
                </a>

            </div>

            <fields-group 
                v-if="deploymentMethodSelected !== ''" 
                :title="$t('sync.settings')">
                <div class="msg msg-icon msg-info">
                    <icon name="info" customWidth="28" customHeight="28" />
                    <p>
                        <span v-if="deploymentMethodSelected !== 'git' && deploymentMethodSelected !== 'netlify' && deploymentMethodSelected !== 'github-pages'" v-pure-html="$t('sync.deploymentMethodFilesPubliiMsg')"></span>
                        
                        <br v-if="deploymentMethodSelected !== 'git' && deploymentMethodSelected !== 'netlify' && deploymentMethodSelected !== 'github-pages'">

                        <span
                            v-if="deploymentMethodSelected === 'netlify'"
                            v-pure-html="$t('sync.deploymentMethodNetlifyMsg')">
                        </span>

                        <span
                            v-if="deploymentMethodSelected === 'git'"
                            v-pure-html="$t('sync.deploymentMethodGitMsg')">
                        </span>
                        
                        <span
                            v-if="deploymentMethodSelected === 'github-pages'"
                            v-pure-html="$t('sync.deploymentMethodGithubPagesMsg')">
                        </span>

                        <span
                            v-if="deploymentMethodSelected === 'gitlab-pages'"
                            v-pure-html="$t('sync.deploymentMethodGitlabPagesMsg')">
                        </span>

                        <span
                            v-if="deploymentMethodSelected === 's3'"
                            v-pure-html="$t('sync.deploymentMethodS3Msg')">
                        </span>

                        <span
                            v-if="deploymentMethodSelected === 'google-cloud'"
                            v-pure-html="$t('sync.deploymentMethodGoogleCloudMsg')">
                        </span>

                        <span v-pure-html="$t('settings.readAboutOurRecommendedServerSettings')"></span>
                    </p>
                </div>

                <field
                    id="domain"
                    :label="$t('sync.websiteURL')">
                    <dropdown
                        v-if="!deploymentSettings.relativeUrls"
                        slot="field"
                        id="http-protocol"
                        key="httpProtocol"
                        :items="httpProtocols"
                        v-model="httpProtocolSelected"></dropdown>

                    <text-input
                        slot="field"
                        id="domain"
                        key="domain"
                        :disabled="deploymentSettings.relativeUrls"
                        :spellcheck="false"
                        v-model="domain" />
                    <small
                        v-if="deploymentMethodSelected === 'github-pages'"
                        class="note"
                        slot="note"
                        v-pure-html="$t('sync.deploymentMethodGithubPagesNote')">
                    </small>
                    <small
                        v-if="deploymentMethodSelected === 'git'"
                        class="note"
                        slot="note"
                        v-pure-html="$t('sync.deploymentMethodGitNote')">
                    </small>

                    <small
                        v-if="!deploymentSettings.relativeUrls && httpProtocolSelected === 'file'"
                        class="note"
                        slot="note">
                        {{ $t('sync.deploymentSettingFileProtocolNote') }}
                    </small>
                    <small
                        v-if="!deploymentSettings.relativeUrls && (['dat', 'hyper', 'ipfs', 'dweb'].indexOf(httpProtocolSelected) > -1)"
                        class="note"
                        slot="note"
                        v-pure-html="$t('sync.deploymentSettingDatHyperIpfsProtocolNote')">
                    </small>
                    <small
                        v-if="!deploymentSettings.relativeUrls && httpProtocolSelected === '//'"
                        class="note"
                        slot="note">
                        {{ $t('sync.deploymentSettingDoubleSlashProtocolNote') }}
                    </small>
                </field>

                <field
                    id="relative-urls"
                    label=" ">
                    <switcher
                        slot="field"
                        id="relative-urls"
                        key="relative-urls"
                        v-model="deploymentSettings.relativeUrls"
                        @click.native="toggleDomainName" />
                    <template slot="second-label">
                        {{ $t('sync.useRelativeURLs') }}
                    </template>
                    <small
                        class="note"
                        slot="note">
                        {{ $t('sync.deploymentSettingRelativeUrlsNote') }}
                    </small>
                </field>

                <field
                    v-if="['ftp', 'ftp+tls', 'sftp', 'sftp+key'].indexOf(deploymentMethodSelected) > -1"
                    id="port"
                    :label="$t('sync.port')">
                    <text-input
                        slot="field"
                        id="port"
                        type="number"
                        key="port"
                        min="1"
                        max="65535"
                        step="1"
                        :class="{ 'is-invalid': errors.indexOf('port') > -1 }"
                        @keyup.native="cleanError('port')"
                        v-model="deploymentSettings.port" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('port') > -1"
                        class="note">
                        {{ $t('sync.portFormatNote') }}
                    </small>
                </field>

                <field
                    v-if="['ftp', 'ftp+tls'].indexOf(deploymentMethodSelected) > -1"
                    id="secure-connection"
                    :label="$t('sync.ftps')"
                    :labelSeparated="true">
                    <switcher
                        slot="field"
                        id="secure-connection"
                        key="secure-connection"
                        :value="deploymentMethodSelected === 'ftp+tls'"
                        @click.native="toggleFtpDeploymentMethod" />
                    <template slot="second-label">
                        {{ $t('sync.useFtps') }}
                    </template>
                    <small
                        slot="note"
                        class="note">
                        {{ $t('sync.deploymentMethodFtpMsg') }}
                    </small>
                </field>

                <field
                    v-if="['ftp', 'ftp+tls', 'sftp', 'sftp+key'].indexOf(deploymentMethodSelected) > -1"
                    id="server"
                    :label="$t('ui.server')">
                    <text-input
                        slot="field"
                        id="server"
                        key="server"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('server') > -1 }"
                        @keyup.native="cleanError('server')"
                        v-model="deploymentSettings.server" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('server') > -1"
                        class="note">
                        {{ $t('sync.serverFieldCantBeEmpty') }}
                    </small>
                </field>

                <field
                    v-if="['ftp', 'ftp+tls', 'sftp', 'sftp+key'].indexOf(deploymentMethodSelected) > -1"
                    id="username"
                    :label="$t('sync.username')">
                    <text-input
                        slot="field"
                        id="username"
                        key="username"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('username') > -1 }"
                        @keyup.native="cleanError('username')"
                        v-model="deploymentSettings.username" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('username') > -1"
                        class="note">
                        {{ $t('sync.usernameFieldCantBeEmpty') }}
                    </small>
                </field>

                <field
                    v-if="['sftp', 'sftp+key'].indexOf(deploymentMethodSelected) > -1"
                    id="sftp-auth-method"
                    :label="$t('sync.authenticationMethod')">
                    <radio-buttons
                        slot="field"
                        id="sftp-auth-method"
                        name="sftp-auth-method"
                        key="sftp-auth-method"
                        :items="sftpAuthMethodItems"
                        v-model="deploymentMethodSelected" />
                </field>

                <field
                    v-if="['ftp', 'ftp+tls', 'sftp'].indexOf(deploymentMethodSelected) > -1 && !deploymentSettings.askforpassword"
                    id="password"
                    :label="$t('settings.password.password')">
                    <text-input
                        slot="field"
                        id="password"
                        type="password"
                        key="password"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('password') > -1 }"
                        @keyup.native="cleanError('password')"
                        v-model="deploymentSettings.password" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('username') > -1"
                        class="note">
                        {{ $t('settings.password.passwordFieldCantBeEmpty') }}
                    </small>
                </field>

                <field
                    v-if="['ftp', 'ftp+tls', 'sftp'].indexOf(deploymentMethodSelected) > -1"
                    id="askforpassword"
                    :label="$t('settings.password.alwaysAskForPassword')"
                    :labelSeparated="true">
                    <switcher
                        slot="field"
                        id="askforpassword"
                        key="askforpassword"
                        v-model="deploymentSettings.askforpassword" />
                    <template slot="second-label">
                        {{ $t('sync.requireFTPPassAlwaysOnSync') }}
                    </template>
                </field>

                <field
                    v-if="['ftp+tls', 'gitlab-pages'].indexOf(deploymentMethodSelected) > -1"
                    id="rejectunauthorized"
                    :label="$t('sync.certificates')"
                    :labelSeparated="true">
                    <switcher
                        slot="field"
                        id="rejectunauthorized"
                        key="rejectunauthorized"
                        v-model="deploymentSettings.rejectUnauthorized" />
                    <template slot="second-label">
                        {{ $t('sync.requireCertificateForConnection') }}
                    </template>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'sftp+key'"
                    id="sftpkey"
                    :label="$t('sync.yourPrivateKey')">
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
                        {{ $t('sync.sftpKeyNote') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'sftp+key'"
                    id="passphrase"
                    :label="$t('sync.passphraseForKey')">
                    <text-input
                        slot="field"
                        id="passphrase"
                        type="password"
                        :spellcheck="false"
                        key="passphrase"
                        v-model="deploymentSettings.passphrase" />

                    <small
                        slot="note"
                        class="note">
                        {{ $t('sync.passphraseForKeyNote') }}
                    </small>
                </field>

                <field
                    v-if="['ftp', 'ftp+tls', 'sftp', 'sftp+key'].indexOf(deploymentMethodSelected) > -1"
                    id="path"
                    :label="$t('sync.remotePath')">
                    <text-input
                        slot="field"
                        id="path"
                        key="path"
                        :spellcheck="false"
                        v-model="deploymentSettings.path" />

                    <small
                        v-if="['ftp', 'ftp+tls'].indexOf(deploymentMethodSelected) > -1"
                        slot="note"
                        class="note">
                        {{ $t('sync.remotePathMatchServerRootPathNote') }}
                    </small>

                    <small
                        v-if="['sftp', 'sftp+key'].indexOf(deploymentMethodSelected) > -1"
                        slot="note"
                        class="note">
                        {{ $t('sync.remotePathMatchServerOrRootPathNote') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'github-pages'"
                    id="gh-server"
                    :label="$t('sync.apiServer')">
                    <text-input
                        slot="field"
                        id="gh-server"
                        key="gh-server"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('github-server') > -1 }"
                        @keyup.native="cleanError('github-server')"
                        v-model="deploymentSettings.github.server" />
                    <small
                        slot="note"
                        class="note">
                        {{ $t('sync.apiServerNote') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'github-pages'"
                    id="gh-user"
                    :label="$t('sync.usernameOrganization')">
                    <text-input
                        slot="field"
                        id="gh-user"
                        key="gh-user"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('github-user') > -1 }"
                        @keyup.native="cleanError('github-user')"
                        v-model="deploymentSettings.github.user" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('github-user') > -1"
                        class="note">
                        {{ $t('sync.usernameFieldCantBeEmpty') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'github-pages'"
                    id="gh-repo"
                    :label="$t('sync.repository')">
                    <text-input
                        slot="field"
                        id="gh-repo"
                        key="gh-repo"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('github-repo') > -1 }"
                        @keyup.native="cleanError('github-repo')"
                        v-model="deploymentSettings.github.repo" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('github-repo') > -1"
                        class="note">
                        {{ $t('sync.repositoryFieldCantBeEmpty') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'github-pages'"
                    id="gh-branch"
                    :label="$t('sync.branch')">
                    <text-input
                        slot="field"
                        id="gh-branch"
                        key="gh-branch"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('github-branch') > -1 }"
                        @keyup.native="cleanError('github-branch')"
                        v-model="deploymentSettings.github.branch" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('github-branch') > -1"
                        class="note">
                        {{ $t('sync.branchFieldCantBeEmpty') }}
                    </small>
                    <small
                        slot="note"
                        class="note"
                        v-pure-html="$t('sync.branchExampleGitHubNote')">
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'github-pages'"
                    id="gh-token"
                    :label="$t('sync.token')">
                    <text-input
                        slot="field"
                        id="gh-token"
                        type="password"
                        key="gh-token"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('github-token') > -1 }"
                        @keyup.native="cleanError('github-token')"
                        v-model="deploymentSettings.github.token" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('github-token') > -1"
                        class="note">
                        {{ $t('sync.tokenFieldCantBeEmpty') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'git'"
                    id="git-url"
                    :label="$t('sync.repositoryUrl')">
                    <text-input
                        slot="field"
                        id="git-url"
                        key="git-url"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('git-url') > -1 }"
                        @keyup.native="cleanError('git-url')"
                        v-model="deploymentSettings.git.url" />
                    <small
                        v-if="errors.indexOf('git-url') > -1"
                        slot="note"
                        class="note">
                        {{ $t('sync.repositoryUrlFieldCantBeEmpty') }}
                    </small>
                    <small
                        slot="note"
                        class="note">
                        {{ $t('sync.repositoryUrlNote') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'git'"
                    id="git-branch"
                    :label="$t('sync.branch')">
                    <text-input
                        slot="field"
                        id="git-branch"
                        key="git-branch"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('git-branch') > -1 }"
                        @keyup.native="cleanError('git-branch')"
                        v-model="deploymentSettings.git.branch" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('git-branch') > -1"
                        class="note">
                        {{ $t('sync.branchFieldCantBeEmpty') }}
                    </small>
                    <small
                        slot="note"
                        class="note"
                        v-pure-html="$t('sync.branchExampleGitNote')">
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'git'"
                    id="git-user"
                    :label="$t('sync.username')">
                    <text-input
                        slot="field"
                        id="git-user"
                        key="git-user"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('git-user') > -1 }"
                        @keyup.native="cleanError('git-user')"
                        v-model="deploymentSettings.git.user" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('github-user') > -1"
                        class="note">
                        {{ $t('sync.usernameFieldCantBeEmpty') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'git'"
                    id="git-password"
                    :label="$t('sync.gitPassword')">
                    <text-input
                        slot="field"
                        id="git-password"
                        type="password"
                        key="git-password"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('git-password') > -1 }"
                        @keyup.native="cleanError('git-password')"
                        v-model="deploymentSettings.git.password" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('git-password') > -1"
                        class="note">
                        {{ $t('settings.password.passwordFieldCantBeEmpty') }}
                    </small>
                    <small
                        slot="note"
                        class="note">
                        {{ $t('sync.gitPasswordNote') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'git'"
                    id="git-commit-author"
                    :label="$t('sync.commitAuthor')">
                    <text-input
                        slot="field"
                        id="git-commit-author"
                        key="git-commit-author"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('git-commitAuthor') > -1 }"
                        @keyup.native="cleanError('git-commitAuthor')"
                        v-model="deploymentSettings.git.commitAuthor" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('git-commitAuthor') > -1"
                        class="note">
                        {{ $t('sync.commitAuthorFieldCantBeEmpty') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'git'"
                    id="git-commit-email"
                    :label="$t('sync.commitEmail')">
                    <text-input
                        slot="field"
                        id="git-commit-email"
                        key="git-commit-email"
                        :spellcheck="false"
                        v-model="deploymentSettings.git.commitEmail" />
                </field>

                <field
                    v-if="deploymentMethodSelected === 'git'"
                    id="git-commit-message"
                    :label="$t('sync.commitMessage')">
                    <text-input
                        slot="field"
                        id="git-commit-message"
                        key="git-commit-message"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('git-commitMessage') > -1 }"
                        @keyup.native="cleanError('git-commitMessage')"
                        v-model="deploymentSettings.git.commitMessage" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('git-commitMessage') > -1"
                        class="note">
                        {{ $t('sync.commitMessageFieldCantBeEmpty') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'github-pages'"
                    id="gh-parallel-operations"
                    :label="$t('sync.parallelUploads')">
                    <dropdown
                        slot="field"
                        id="gh-parallel-operations"
                        :items="Array.from(Array(25).keys()).map(n => ({value: n + 1, label: n + 1}))"
                        key="gh-parallel-operations"
                        v-model="deploymentSettings.github.parallelOperations"></dropdown>
                    <small
                        slot="note"
                        class="note">
                        {{ $t('sync.parallelUploadsNote') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'github-pages'"
                    id="gh-api-rate-limiting"
                    :label="$t('sync.apiRateLimiting')">
                    <switcher
                        slot="field"
                        id="gh-api-rate-limiting"
                        key="gh-api-rate-limiting"
                        v-model="deploymentSettings.github.apiRateLimiting" />
                    <small
                        slot="note"
                        class="note">
                        {{ $t('sync.apiRateLimitingNote') }}
                    </small>
                </field>


                <field
                    v-if="deploymentMethodSelected === 'gitlab-pages'"
                    id="gl-server"
                    :label="$t('ui.server')">
                    <text-input
                        slot="field"
                        id="gl-server"
                        key="gl-server"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('gitlab-server') > -1 }"
                        @keyup.native="cleanError('gitlab-server')"
                        v-model="deploymentSettings.gitlab.server" />
                    <small
                        slot="note"
                        class="note">
                        {{ $t('sync.serverGitLabNote') }}
                    </small>
                </field>
                
                <field
                    v-if="deploymentMethodSelected === 'gitlab-pages'"
                    id="gl-repo"
                    :label="$t('sync.repository')">
                    <text-input
                        slot="field"
                        id="gl-repo"
                        key="gl-repo"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('gitlab-repo') > -1 }"
                        @keyup.native="cleanError('gitlab-repo')"
                        v-model="deploymentSettings.gitlab.repo" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('gitlab-repo') > -1"
                        class="note">
                        {{ $t('sync.repositoryFieldCantBeEmpty') }}
                    </small>
                    <small
                        slot="note"
                        class="note">
                        {{ $t('sync.fieldIsCaseSensitive') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'gitlab-pages'"
                    id="gl-branch"
                    :label="$t('sync.branch')">
                    <text-input
                        slot="field"
                        id="gl-branch"
                        key="gl-branch"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('gitlab-branch') > -1 }"
                        @keyup.native="cleanError('gitlab-branch')"
                        v-model="deploymentSettings.gitlab.branch" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('gitlab-branch') > -1"
                        class="note">
                        {{ $t('sync.branchFieldCantBeEmpty') }}
                    </small>
                    <small
                        slot="note"
                        class="note"
                        v-pure-html="$t('sync.branchExampleGitLabeNote')">
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'gitlab-pages'"
                    id="gl-token"
                    :label="$t('sync.token')">
                    <text-input
                        slot="field"
                        id="gl-token"
                        type="password"
                        key="gl-token"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('gitlab-token') > -1 }"
                        @keyup.native="cleanError('gitlab-token')"
                        v-model="deploymentSettings.gitlab.token" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('gitlab-token') > -1"
                        class="note">
                        {{ $t('sync.tokenFieldCantBeEmpty') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'netlify'"
                    id="netlify-id"
                    :label="$t('sync.siteID')">
                    <text-input
                        slot="field"
                        id="netlify-id"
                        key="netlify-id"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('netlify-id') > -1 }"
                        @keyup.native="cleanError('netlify-id')"
                        v-model="deploymentSettings.netlify.id" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('netlify-id') > -1"
                        class="note">
                        {{ $t('sync.siteFieldCantBeEmpty') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'netlify'"
                    id="netlify-token"
                    :label="$t('sync.netlifyToken')">
                    <text-input
                        slot="field"
                        id="netlify-token"
                        type="password"
                        key="netlify-token"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('netlify-token') > -1 }"
                        @keyup.native="cleanError('netlify-token')"
                        v-model="deploymentSettings.netlify.token" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('netlify-token') > -1"
                        class="note">
                        {{ $t('sync.tokenFieldCantBeEmpty') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 's3'"
                    id="s3-provider"
                    label=" ">
                    <switcher
                        slot="field"
                        id="s3-provider"
                        key="s3-provider"
                        v-model="deploymentSettings.s3.customProvider"
                        @click.native="toggleS3Provider" />
                    <template slot="second-label">
                        {{ $t('sync.useCustomS3Provider') }}
                    </template>
                    <small
                        class="note"
                        slot="note">
                        {{ $t('sync.useCustomS3ProviderNote') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 's3' && deploymentSettings.s3.customProvider"
                    id="s3-endpoint"
                    :label="$t('sync.s3ProviderEndpoint')">
                    <text-input
                        slot="field"
                        id="s3-endpoint"
                        key="s3-endpoint"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('s3-endpoint') > -1 }"
                        @keyup.native="cleanError('s3-endpoint')"
                        v-model="deploymentSettings.s3.endpoint" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('s3-endpoint') > -1"
                        class="note">
                        {{ $t('sync.s3ProviderEndpointNote') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 's3'"
                    id="s3-id"
                    :label="$t('sync.accessID')">
                    <text-input
                        slot="field"
                        id="s3-id"
                        type="password"
                        key="s3-id"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('s3-id') > -1 }"
                        @keyup.native="cleanError('s3-id')"
                        v-model="deploymentSettings.s3.id" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('s3-id') > -1"
                        class="note">
                        {{ $t('sync.accessIDFieldCantBeEmpty') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 's3'"
                    id="s3-key"
                    :label="$t('sync.secretKey')">
                    <text-input
                        slot="field"
                        id="s3-key"
                        type="password"
                        key="s3-key"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('s3-key') > -1 }"
                        @keyup.native="cleanError('s3-key')"
                        v-model="deploymentSettings.s3.key" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('s3-key') > -1"
                        class="note">
                        {{ $t('sync.secretKeyFieldCantBeEmpty') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 's3'"
                    id="s3-bucket"
                    :label="$t('sync.bucket')">
                    <text-input
                        slot="field"
                        id="s3-bucket"
                        key="s3-bucket"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('s3-bucket') > -1 }"
                        @keyup.native="cleanError('s3-bucket')"
                        v-model="deploymentSettings.s3.bucket" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('s3-bucket') > -1"
                        class="note">
                        {{ $t('sync.bucketFieldCantBeEmpty') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 's3'"
                    id="s3-region"
                    :label="$t('sync.region')">
                    <dropdown
                        v-if="!deploymentSettings.s3.customProvider"
                        slot="field"
                        id="s3-region"
                        :items="s3Regions"
                        key="s3-region"
                        :class="{ 'is-invalid': errors.indexOf('s3-region') > -1 }"
                        @click.native="cleanError('s3-region')"
                        v-model="deploymentSettings.s3.region"></dropdown>
                    <text-input
                        v-if="deploymentSettings.s3.customProvider"
                        slot="field"
                        id="s3-customRegion"
                        key="s3-customRegion"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('s3-customRegion') > -1 }"
                        @keyup.native="cleanError('s3-customRegion')"
                        v-model="deploymentSettings.s3.customRegion" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('s3-region') > -1 || errors.indexOf('s3-customRegion') > -1"
                        class="note">
                        {{ $t('sync.regionFieldCantBeEmpty') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 's3'"
                    id="s3-prefix"
                    :label="$t('sync.prefix')">
                    <text-input
                        slot="field"
                        id="s3-prefix"
                        key="s3-prefix"
                        :spellcheck="false"
                        v-model="deploymentSettings.s3.prefix" />
                    <small
                        slot="note"
                        class="note"
                        v-pure-html="$t('sync.s3PrefixNote')">
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 's3'"
                    id="s3-acl"
                    :label="$t('sync.acl')">
                    <dropdown
                        slot="field"
                        id="s3-acl"
                        :items="s3acls"
                        key="s3-acl"
                        v-model="deploymentSettings.s3.acl"></dropdown>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'google-cloud'"
                    id="google-key"
                    :label="$t('sync.yourJSONKey')">
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
                        {{ $t('sync.yourJSONKeyFieldCantBeEmpty') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'google-cloud'"
                    id="google-bucket"
                    :label="$t('sync.bucket')">
                    <text-input
                        slot="field"
                        id="google-bucket"
                        key="google-bucket"
                        :spellcheck="false"
                        :class="{ 'is-invalid': errors.indexOf('google-bucket') > -1 }"
                        @keyup.native="cleanError('google-bucket')"
                        v-model="deploymentSettings.google.bucket" />
                    <small
                        slot="note"
                        v-if="errors.indexOf('google-bucket') > -1"
                        class="note">
                        {{ $t('sync.bucketFieldCantBeEmpty') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'google-cloud'"
                    id="google-prefix"
                    :label="$t('sync.prefix')">
                    <text-input
                        slot="field"
                        id="google-prefix"
                        key="google-prefix"
                        :spellcheck="false"
                        v-model="deploymentSettings.google.prefix" />
                    <small
                        slot="note"
                        class="note"
                        v-pure-html="$t('sync.googleCloudPrefixNote')">
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'manual'"
                    id="manual-output"
                    :label="$t('sync.outputType')">
                    <dropdown
                        slot="field"
                        id="manual-output"
                        key="manual-output"
                        :items="{ 'catalog': $t('sync.nonCompressedCatalog'), 'zip-archive': $t('sync.zipArchive'), 'tar-archive': $t('sync.tarArchive') }"
                        :class="{ 'is-invalid': errors.indexOf('manual-output') > -1 }"
                        @click.native="cleanError('manual-output')"
                        v-model="deploymentSettings.manual.output"></dropdown>

                    <small
                        slot="note"
                        v-if="errors.indexOf('manual-output') > -1"
                        class="note">
                        {{ $t('sync.manualOutputFieldCantBeEmpty') }}
                    </small>

                    <small
                        slot="note"
                        class="note">
                        {{ $t('sync.outputTypeNote') }}
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'manual'"
                    id="manual-output-dir"
                    :label="$t('sync.outputDirectory')">
                    <dir-select
                        id="manual-output-dir"
                        v-model="deploymentSettings.manual.outputDirectory"
                        :placeholder="$t('sync.leaveBlankToUseDefaultOutputDirectory')"
                        slot="field"
                        key="manual-output-dir" />

                    <small
                        v-if="deploymentSettings.manual.outputDirectory"
                        slot="note"
                        class="note">
                        {{ $t('sync.outputDirectoryNote', { siteName: this.$store.state.currentSite.config.name }) }}
                    </small>
                </field>
            </fields-group>

            <p-footer v-if="deploymentMethodSelected !== ''">
                <p-button
                    :onClick="save"
                    slot="buttons">
                    {{ $t('settings.saveSettings') }}
                </p-button>

                <p-button
                    v-if="deploymentMethodSelected !== 'manual'"
                    :onClick="testConnection"
                    :disabled="testInProgress"
                    slot="buttons"
                    type="secondary">
                    <template v-if="!testInProgress">{{ $t('sync.testConnection') }}</template>
                    <template v-if="testInProgress">{{ $t('sync.checkingConnection') }}</template>
                </p-button>
            </p-footer>
        </div>
    </section>
</template>

<script>
import Vue from 'vue';
import Utils from './../helpers/utils.js';
import defaultDeploymentSettings from './configs/defaultDeploymentSettings.js';
import s3RegionsList from './configs/s3Regions.js';
import s3ACLs from './configs/s3ACLs.js';

export default {
    name: 'server-settings',
    data () {
        return {
            isLoaded: false,
            domain: '',
            httpProtocols: {
                'https': 'https://',
                'http': 'http://',
                'file': 'file://',
                'dat': 'dat://',
                'hyper': 'hyper://',
                'ipfs': 'ipfs://',
                'dweb': 'dweb://',
                '//': '//'
            },
            httpProtocolSelected: '',
            deploymentMethods: {
                'git': this.$t('sync.git'),
                'github-pages': this.$t('sync.githubPages'),
                'gitlab-pages': this.$t('sync.gitlabPages'),
                'netlify': this.$t('sync.netlify'),
                's3': this.$t('sync.s3CompatibleStorage'),
                'google-cloud': this.$t('sync.googleCloud'),
                'ftp': this.$t('sync.ftp'),
                'sftp': this.$t('sync.sftpWithPassword'),
                'sftp+key': this.$t('sync.sftpWithKey'),
                'ftp+tls': this.$t('sync.ftpWithSSLTLS'),
                'manual': this.$t('sync.ManualUpload')
            },
            deploymentMethodSelected: '',
            deploymentSettings: defaultDeploymentSettings,
            s3Regions: s3RegionsList,
            s3acls: s3ACLs,
            testInProgress: false,
            errors: []
        };
    },
    computed: {
        currentDomain () {
            if (this.$store.state.currentSite.config.domain === '.') {
                return './';
            }

            return this.$store.state.currentSite.config.domain.replace('http://', '').replace('https://', '').replace('file:///', '').replace('file://', '');
        },
        currentHttpProtocol () {
            if (this.$store.state.currentSite.config.domain.indexOf('file') === 0) {
                return 'file';
            } else if (this.$store.state.currentSite.config.domain.indexOf('http:') === 0) {
                return 'http';
            } else {
                return 'https';
            }
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
                return this.$t('sync.visitYourWebsite');
            } else {
                return this.$t('sync.afterInitialSyncSiteWillBeAvailableOnline');
            }
        },
        sftpAuthMethodItems () {
            return [
                { value: "sftp", label: this.$t('settings.password.password') },
                { value: "sftp+key", label: this.$t('sync.keyFile') }
            ];
        }
    },
    watch: {
        deploymentMethodSelected: function (newValue) {
            setTimeout(() => {
                this.setPortValue();
            }, 0);
        }
    },
    async mounted () {
        this.isLoaded = false;
        this.domain = this.currentDomain;
        this.httpProtocolSelected = this.currentHttpProtocol;
        this.deploymentMethodSelected = this.$store.state.currentSite.config.deployment.protocol || '';
        let storedDeploymentSettings = JSON.parse(JSON.stringify(this.$store.state.currentSite.config.deployment));
        storedDeploymentSettings = await this.loadPasswords(storedDeploymentSettings);
        Vue.set(this, 'deploymentSettings', Utils.deepMerge(this.deploymentSettings, storedDeploymentSettings));

        if (this.deploymentSettings.manual.output === '') {
            this.deploymentSettings.manual.output = 'catalog';
        }

        setTimeout(() => {
            this.setPortValue();
            this.isLoaded = true;
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
                case 's3':
                case 'git':
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
            return this.domain.replace('http://', '').replace('https://', '').replace('file://', '').replace(/\/$/, '');
        },
        fullDomainName () {
            let domain = this.prepareDomain();

            if ((domain === '' || domain === '.') && this.deploymentSettings.relativeUrls) {
                domain = '/';
            }

            if (this.deploymentSettings.relativeUrls) {
                return domain;
            }

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

            if (this.httpProtocolSelected === 'file' && this.deploymentMethodSelected !== 'manual') {
                this.httpProtocolSelected = 'https';
            }

            if (this.httpProtocolSelected === '//') {
                return '//' + domain;
            }

            return this.httpProtocolSelected + '://' + domain;
        },
        save () {
            if(!this.validate()) {
                this.$bus.$emit('message-display', {
                    message: this.$t('ui.fillAllRequiredFields'),
                    type: 'warning',
                    lifeTime: 3
                });

                return;
            }

            let newSettings = this.getDeploymentSettings();

            mainProcessAPI.send('app-site-config-save', {
                "site": this.$store.state.currentSite.config.name,
                "settings": newSettings,
                "source": "server"
            });

            mainProcessAPI.receiveOnce('app-site-config-saved', (data) => {
                if(data.status === true) {
                    this.saved(newSettings);
                }

                if(data.message === 'success-save') {
                    this.$bus.$emit('message-display', {
                        message: this.$t('sync.serverSettingsSaveSuccessMsg'),
                        type: 'success',
                        lifeTime: 3
                    });
                }

                if(data.message === 'no-keyring') {
                    if (document.body.getAttribute('data-os') === 'linux') {
                        this.$bus.$emit('alert-display', {
                            message: this.$t('sync.serverSettingsSaveLinuxErrorMsg'),
                            okLabel: this.$t('ui.iUnderstand'),
                        });
                    } else {
                        this.$bus.$emit('alert-display', {
                            message: this.$t('sync.serverSettingsSaveErrorMsg'),
                            okLabel: this.$t('ui.iUnderstand'),
                        });
                    }
                }
            });
        },
        saved (newSettings) {
            newSettings.deployment = this.setHiddenPasswords(JSON.parse(JSON.stringify(newSettings.deployment)));

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
                    message: this.$t('sync.provideFTPPasswordFor') + this.$refs['server'].getValue(),
                    okClick: (password) => {
                        if(!password) {
                            this.$bus.$emit('alert-display', {
                                message: this.$t('sync.testConnectionNoPasswordMsg')
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
                    message: this.$t('ui.fillAllRequiredFields'),
                    type: 'warning',
                    lifeTime: 3
                });

                return;
            }

            let deploymentSettings = this.getDeploymentSettings().deployment;

            if(password) {
                deploymentSettings.password = password;
            }

            this.testInProgress = true;

            mainProcessAPI.send('app-deploy-test', {
                siteName: this.$store.state.currentSite.config.name,
                deploymentConfig: deploymentSettings,
                uuid: this.$store.state.currentSite.config.uuid
            });

            mainProcessAPI.receiveOnce('app-deploy-test-success', (data) => {
                this.$bus.$emit('alert-display', {
                    message: this.$t('sync.connectToServerSuccessMsg'),
                    buttonStyle: 'success'
                });

                this.testInProgress = false;
                this.save();
            });

            mainProcessAPI.receiveOnce('app-deploy-test-write-error', (data) => {
                this.$bus.$emit('alert-display', {
                    message: this.$t('sync.connectToServerCantStoreFilesErrorMsg'),
                    buttonStyle: 'danger'
                });

                this.testInProgress = false;
            });

            mainProcessAPI.receiveOnce('app-deploy-test-error', (data) => {
                console.log(data);
                if(data && data.message) {
                    if (data.message.translation) {
                        data.message = this.$t(data.message.translation);
                    }
                    this.$bus.$emit('alert-display', {
                        message: data.noAdditionalMessage ? data.message : this.$t('sync.connectToServerCantStoreFilesErrorMsg') + ': ' + data.message,
                        buttonStyle: 'danger'
                    });
                } else {
                    this.$bus.$emit('alert-display', {
                        message: this.$t('sync.connectToServerCantStoreFilesErrorMsg') + '.',
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
                case 'git':
                    this.validateGit();
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
            let portValue = parseInt(this.deploymentSettings.port.trim(), 10)

            if (this.deploymentSettings.port.trim() === '' || isNaN(portValue) || portValue < 1 || portValue > 65535) {
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

            if (this.deploymentSettings.s3.customProvider) {
                fields = ['s3_endpoint', 's3_id', 's3_key', 's3_bucket', 's3_customRegion'];
            }

            return this.validateFields(fields);
        },
        validateGit () {
            let fields = ['git_url', 'git_user', 'git_password', 'git_branch', 'git_commitAuthor', 'git_commitMessage'];
            return this.validateFields(fields);
        },
        validateGithubPages () {
            let fields = ['github_server', 'github_user', 'github_repo', 'github_branch', 'github_token'];
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

            let urlToOpen = Utils.getValidUrl(this.$store.state.currentSite.config.domain);

            if (urlToOpen) {
                mainProcessAPI.shellOpenExternal(urlToOpen);
            } else {
                alert(this.$t('sync.websiteLinkInvalidMsg'));
            }
        },
        cleanError (field) {
            let pos = this.errors.indexOf(field);

            if (pos !== -1) {
                this.errors.splice(pos, 1);
            }
        },
        toggleDomainName () {
            if (this.deploymentSettings.relativeUrls) {
                this.domain = '/';
            } else {
                this.domain = '';
            }
        },
        getDeploymentMethodName (method) {
            switch (method) {
                case 'github-pages': return this.$t('sync.githubPages');
                case 'gitlab-pages': return this.$t('sync.gitlabPages');
                case 'git': return this.$t('sync.git');
                case 'netlify': return this.$t('sync.netlify');
                case 's3': return this.$t('sync.s3CompatibleStorage');
                case 'google-cloud': return this.$t('sync.googleCloud');
                case 'ftp': return this.$t('sync.ftp');
                case 'sftp': return this.$t('sync.sftp');
                case 'sftp+key': return  this.$t('sync.sftpWithKey');
                case 'ftp+tls': return this.$t('sync.ftpWithSSLTLS');
                case 'manual': return this.$t('sync.ManualUpload');
            }

            return '';
        },
        async loadPasswords (deploymentSettings) {
            deploymentSettings.password = await mainProcessAPI.invoke('app-main-process-load-password', 'publii', deploymentSettings.password);

            if (deploymentSettings.passphrase) {
                deploymentSettings.passphrase = await mainProcessAPI.invoke('app-main-process-load-password', 'publii-passphrase', deploymentSettings.passphrase);
            }

            if (deploymentSettings.s3) {
                deploymentSettings.s3.id = await mainProcessAPI.invoke('app-main-process-load-password', 'publii-s3-id', deploymentSettings.s3.id);
                deploymentSettings.s3.key = await mainProcessAPI.invoke('app-main-process-load-password', 'publii-s3-key', deploymentSettings.s3.key);
            }

            if (deploymentSettings.netlify) {
                deploymentSettings.netlify.id = await mainProcessAPI.invoke('app-main-process-load-password', 'publii-netlify-id', deploymentSettings.netlify.id);
                deploymentSettings.netlify.token = await mainProcessAPI.invoke('app-main-process-load-password', 'publii-netlify-token', deploymentSettings.netlify.token);
            }

            if (deploymentSettings.github) {
                deploymentSettings.github.token = await mainProcessAPI.invoke('app-main-process-load-password', 'publii-gh-token', deploymentSettings.github.token);
            }

            if (deploymentSettings.git) {
                deploymentSettings.git.password = await mainProcessAPI.invoke('app-main-process-load-password', 'publii-git-password', deploymentSettings.git.password);
            }

            if (deploymentSettings.gitlab) {
                deploymentSettings.gitlab.token = await mainProcessAPI.invoke('app-main-process-load-password', 'publii-gl-token', deploymentSettings.gitlab.token);
            }

            return deploymentSettings;
        },
        setHiddenPasswords (deploymentSettings) {
            let passwordKey = this.$store.state.currentSite.config.name;

            if (this.$store.state.currentSite.config.uuid) {
                passwordKey = this.$store.state.currentSite.config.uuid;
            }

            deploymentSettings.password = 'publii ' + passwordKey;

            if (deploymentSettings.passphrase) {
                deploymentSettings.passphrase = 'publii-passphrase ' + passwordKey;
            }

            if (deploymentSettings.s3) {
                deploymentSettings.s3.id = 'publii-s3-id ' + passwordKey;
                deploymentSettings.s3.key = 'publii-s3-key ' + passwordKey;
            }

            if (deploymentSettings.netlify) {
                deploymentSettings.netlify.id = 'publii-netlify-id ' + passwordKey;
                deploymentSettings.netlify.token = 'publii-netlify-token ' + passwordKey;
            }

            if (deploymentSettings.git) {
                deploymentSettings.git.password = 'publii-git-password ' + passwordKey;
            }

            if (deploymentSettings.github) {
                deploymentSettings.github.token = 'publii-gh-token ' + passwordKey;
            }

            if (deploymentSettings.gitlab) {
                deploymentSettings.gitlab.token = 'publii-gl-token ' + passwordKey;
            }

            return deploymentSettings;
        },
        toggleFtpDeploymentMethod () {
            if (this.deploymentMethodSelected === 'ftp+tls') {
                this.deploymentMethodSelected = 'ftp';
            } else {
                this.deploymentMethodSelected = 'ftp+tls';
            }
        },
        toggleS3Provider () {
            if (this.deploymentSettings.s3.customProvider) {
                this.deploymentSettings.s3.provider = 'custom';
            } else {
                this.deploymentSettings.s3.provider = 'aws';
            }
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/notifications.scss';

.server-settings {
    margin: 0 auto;
    max-width: $wrapper;
    user-select: none;

    #http-protocol {
        float: left;
        width: 110px;

        & + .input-wrapper {
            float: right;
            width: calc(100% - 120px);
        }
    }

    .is-invalid + .note {
        color: var(--warning);
    }

    &-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 2rem;

        &-item {
            align-items: center;
            background-color: var(--bg-secondary);
            border: 1px solid transparent;
            border-radius: var(--border-radius);
            box-shadow: var(--box-shadow-small);
            color: var(--text-primary-color);
            display: flex;
            flex-direction: column;
            fill: var(--icon-primary-color);
            font-weight: var(--font-weight-semibold);
            justify-content: center;
            min-height: calc(8rem + 8vh);
            position: relative;
            transition: var(--transition);

            &:hover {
                background: var(--bg-primary);
                border-color: var(--color-primary);
                box-shadow: var(--box-shadow-medium);
                color: var(--color-primary);
                cursor: pointer;
            }

            & > svg {
                margin: 0 auto 1rem;
                transition: inherit;
            }

            &.deployment-others {
                h3 {
                    color: var(--text-primary-color);
                    font-size: $app-font-base;
                    font-weight: var(--font-weight-semibold);
                    margin-bottom: 0;
                    transition: inherit;
                }

                svg {
                    fill: var(--icon-primary-color);
                    transition: inherit;
                }

                &:hover {
                    svg {
                        fill: var(--color-primary);
                    }

                    h3 {
                        color: var(--color-primary);
                    }
                }
            }
        }
    }

    #relative-urls {
        margin-top: 0;
    }

    .msg {
        margin-bottom: 3rem;
    }
}

/*
 * Responsive improvements
 */

 @media (max-height: 900px) {
    .server-settings-grid-item > svg {
        transform: scale(0.9);
    }
}

@media (max-width: 1400px) {
    .server-settings-grid-item > svg {
        transform: scale(0.9);
    }
}
</style>
