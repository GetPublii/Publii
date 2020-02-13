<template>
    <section
        class="content"
        ref="content">
        <div class="server-settings">
            <p-header 
                v-if="deploymentMethodSelected !== ''" 
                :title="getDeploymentMethodName(deploymentMethodSelected) + ' settings'">
                <p-button
                    @click.native="deploymentMethodSelected = ''"
                    slot="buttons"
                    title="Click to change currently used deployment method"
                    type="outline">
                    Change server type
                </p-button>

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

            <div class="deployment-notice" v-if="['ftp', 'netlify', 'github-pages', 'gitlab-pages', 's3', 'google-cloud'].indexOf(deploymentMethodSelected) > -1">
                <template v-if="deploymentMethodSelected === 'ftp'">
                    The FTP protocol uses an unencrypted transmission. We strongly recommend to use FTPS or SFTP protocols if possible.
                </template>

                <template v-if="deploymentMethodSelected === 'netlify'">
                    Read how to <a href="https://getpublii.com/docs/build-a-static-website-with-netlify.html" target="_blank">configure a website using Netlify</a>.
                </template>

                <template v-if="deploymentMethodSelected === 'github-pages'">
                    Read how to <a href="https://getpublii.com/docs/host-static-website-github-pages.html" target="_blank">configure a website using Github Pages</a>
                </template>

                <template v-if="deploymentMethodSelected === 'gitlab-pages'">
                    Read how to <a href="https://getpublii.com/docs/host-static-website-gitlab-pages.html" target="_blank">configure a website using GitLab Pages</a>
                </template>

                <template v-if="deploymentMethodSelected === 's3'">
                    Read how to <a href="https://getpublii.com/docs/setup-static-website-hosting-amazon-s3.html" target="_blank">configure a website using S3</a>
                </template>

                <template v-if="deploymentMethodSelected === 'google-cloud'">
                    Read how to <a href="https://getpublii.com/docs/make-static-website-google-cloud.html" target="_blank">configure a website using Google Cloud</a>
                </template>
            </div>

            <p-header 
                v-if="deploymentMethodSelected === ''" 
                title="Select server type:">
            </p-header>

            <div 
                v-if="deploymentMethodSelected === ''"
                class="server-settings-intro">   
                
                 <div @click="deploymentMethodSelected = 'ftp'" title="FTP">
                   <icon
                      customWidth="69"
                      customHeight="42"                   
                      name="ftp" />
                </div>

                <div @click="deploymentMethodSelected = 'sftp'" title="SFTP">
                   <icon
                      customWidth="69"
                      customHeight="42"                   
                      name="sftp" />
                </div>               

                <div @click="deploymentMethodSelected = 's3'" title="AWS S3">
                   <icon
                      customWidth="48"
                      customHeight="48"                    
                      name="aws" />
                </div>
                
                <div @click="deploymentMethodSelected = 'github-pages'" title="Github Pages">
                    <icon
                      customWidth="129"
                      customHeight="42"                     
                      name="githubpages" />
                </div>

                <div @click="deploymentMethodSelected = 'gitlab-pages'" title="Gitlab Pages">
                    <icon
                      customWidth="113"
                      customHeight="40"                     
                      name="gitlab" />
                </div>
                
                <div @click="deploymentMethodSelected = 'netlify'" title="Netlify">
                   <icon
                      customWidth="102"
                      customHeight="48"                     
                      name="netlify" />
                </div>

                <div @click="deploymentMethodSelected = 'google-cloud'" title="Google Cloud">
                    <icon
                      customWidth="167"
                      customHeight="40"                     
                      name="googlecloud" />
                </div>
                
                <div @click="deploymentMethodSelected = 'manual'" title="Manual deployment">
                   <icon
                      customWidth="50"
                      customHeight="50"                   
                      name="zip" />
                </div>
            </div>

            <fields-group v-if="deploymentMethodSelected !== ''">
                <field
                    id="domain"
                    label="Domain">
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
                        :spellcheck="false"
                        v-model="domain" />
                    <small 
                        v-if="deploymentMethodSelected === 'github-pages'"
                        class="note"
                        slot="note">
                        This will be your Github repository path, which should use the following format: <strong>YOUR_USERNAME.github.io/YOUR_REPOSITORY_NAME</strong>.<br> 
                        If you are using a custom domain name, set this field to just the custom domain name.
                    </small>
                    
                    <small
                        v-if="!deploymentSettings.relativeUrls && httpProtocolSelected === 'file'"
                        class="note"
                        slot="note">
                        The "file://" protocol is useful only if you are using manual deployment method for the intranet websites.
                    </small>
                    <small
                        v-if="!deploymentSettings.relativeUrls && (httpProtocolSelected === 'dat' || httpProtocolSelected === 'ipfs')"
                        class="note"
                        slot="note">
                        The "dat://" and the "ipfs://" protocol is useful only if you have plans to use your website on P2P networks. Read more about <a href="https://datproject.org/" target="_blank">dat://</a> and <a href="https://ipfs.io/" target="_blank">IPFS</a>
                    </small>
                    <small
                        v-if="!deploymentSettings.relativeUrls && httpProtocolSelected === '//'"
                        class="note"
                        slot="note">
                        Please remember: while using "//" as protocol, some features like Open Graph tags, sharing buttons etc. cannot work properly.
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
                        Use relative URLs
                    </template>
                    <small
                        class="note"
                        slot="note">
                        Please remember: while using relative URLs, some features like Open Graph tags, sharing buttons etc. cannot work properly.
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
                        The port field cannot be empty and must be a positive integer between 1 and 65535.
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
                        :spellcheck="false"
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
                        :spellcheck="false"
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
                        :spellcheck="false"
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
                    v-if="['ftp+tls'].indexOf(deploymentMethodSelected) > -1"
                    id="rejectunauthorized"
                    label="Certificates"
                    :labelSeparated="true">
                    <switcher
                        slot="field"
                        id="rejectunauthorized"
                        key="rejectunauthorized"
                        v-model="deploymentSettings.rejectUnauthorized" />
                    <template slot="second-label">
                        Require the valid certificate for connection
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
                        :spellcheck="false"
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
                        :spellcheck="false"
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
                    id="gh-server"
                    label="API Server">
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
                        Change this value only if you are using your own GitHub instance (Enterprise edition).
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 'github-pages'"
                    id="gh-user"
                    label="Username / Organization">
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
                        :spellcheck="false"
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
                        :spellcheck="false"
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
                        :spellcheck="false"
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
                    v-if="deploymentMethodSelected === 'github-pages'"
                    id="gh-parallel-operations"
                    label="Parallel uploads">
                    <dropdown
                        slot="field"
                        id="gh-parallel-operations"
                        :items="Array.from(Array(25).keys()).map(n => ({value: n + 1, label: n + 1}))"
                        key="gh-parallel-operations"
                        v-model="deploymentSettings.github.parallelOperations"></dropdown>
                    <small
                        slot="note"
                        class="note">
                        More parallel operations can lead to upload errors on slow internet connections or error 403 due API rate limits.
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
                        :spellcheck="false"
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
                        :spellcheck="false"
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
                        :spellcheck="false"
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
                        :spellcheck="false"
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
                        :spellcheck="false"
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
                        :spellcheck="false"
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
                        :spellcheck="false"
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
                        :spellcheck="false"
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
                        :spellcheck="false"
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
                        :spellcheck="false"
                        v-model="deploymentSettings.s3.prefix" />
                    <small
                        slot="note"
                        class="note">
                        You can put your website in the subdirectory. Please avoid slash at the beginning (i.e. <strong>/blog/</strong>) - as it will create additional directory with the empty name. Proper prefix example: <strong>blog/</strong>.
                    </small>
                </field>

                <field
                    v-if="deploymentMethodSelected === 's3'"
                    id="s3-acl"
                    label="ACL">
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
                        :spellcheck="false"
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
                        :spellcheck="false"
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
                        :items="{ 'catalog': 'Non-compressed catalog', 'zip-archive': 'ZIP archive', 'tar-archive': 'TAR archive' }"
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

            <p-footer v-if="deploymentMethodSelected !== ''">
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
import Vue from 'vue';
import { shell, ipcRenderer, remote } from 'electron';
import Utils from './../helpers/utils.js';
import defaultDeploymentSettings from './configs/defaultDeploymentSettings.js';
import s3RegionsList from './configs/s3Regions.js';
import s3ACLs from './configs/s3ACLs.js';
const mainProcess = remote.require('./main');

export default {
    name: 'server-settings',
    data () {
        return {
            domain: '',
            httpProtocols: {
                'http': 'http://',
                'https': 'https://',
                'file': 'file://',
                'dat': 'dat://',
                'ipfs': 'ipfs://',
                '//': '//'
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
            s3acls: s3ACLs,
            testInProgress: false,
            errors: []
        };
    },
    computed: {
        currentDomain () {
            return this.$store.state.currentSite.config.domain.replace('http://', '').replace('https://', '').replace('file://', '');
        },
        currentHttpProtocol () {
            if (this.$store.state.currentSite.config.domain.indexOf('file') === 0) {
                return 'file';
            } else if (this.$store.state.currentSite.config.domain.indexOf('https') === 0) {
                return 'https';
            } else {
                return 'http';
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
    async mounted () {
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
            return this.domain.replace('http://', '').replace('https://', '').replace('file://', '').replace(/\/$/, '');
        },
        fullDomainName () {
            let domain = this.prepareDomain();

            if (domain === '' && this.deploymentSettings.relativeUrls) {
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
                this.save();
            });

            ipcRenderer.once('app-deploy-test-write-error', (event, data) => {
                this.$bus.$emit('alert-display', {
                    message: 'Error! Application was able to connect with your server but was unable to store files. Please check file permissions on your server.',
                    buttonStyle: 'danger'
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
                shell.openExternal(urlToOpen);
            } else {
                alert('Sorry! The website link seems to be invalid.');
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
                case 'github-pages': return 'Github Pages';
                case 'gitlab-pages': return 'GitLab Pages';
                case 'netlify': return 'Netlify';
                case 's3': return 'Amazon S3';
                case 'google-cloud': return 'Google Cloud';
                case 'ftp': return 'FTP';
                case 'sftp':
                case 'sftp+key': return 'SFTP';
                case 'ftp+tls': return 'FTP with SSL/TLS';
                case 'manual': return 'Manual upload';
            }

            return '';
        },
        async loadPasswords (deploymentSettings) {
            deploymentSettings.password = await mainProcess.loadPassword('publii', deploymentSettings.password);

            if (deploymentSettings.passphrase) {
                deploymentSettings.passphrase = await mainProcess.loadPassword('publii-passphrase', deploymentSettings.passphrase);
            }

            if (deploymentSettings.s3) {
                deploymentSettings.s3.id = await mainProcess.loadPassword('publii-s3-id', deploymentSettings.s3.id);
                deploymentSettings.s3.key = await mainProcess.loadPassword('publii-s3-key', deploymentSettings.s3.key);
            }

            if (deploymentSettings.netlify) {
                deploymentSettings.netlify.id = await mainProcess.loadPassword('publii-netlify-id', deploymentSettings.netlify.id);
                deploymentSettings.netlify.token = await mainProcess.loadPassword('publii-netlify-token', deploymentSettings.netlify.token);
            }

            if (deploymentSettings.github) {
                deploymentSettings.github.token = await mainProcess.loadPassword('publii-gh-token', deploymentSettings.github.token);
            }

            if (deploymentSettings.gitlab) {
                deploymentSettings.gitlab.token = await mainProcess.loadPassword('publii-gl-token', deploymentSettings.gitlab.token);
            }

            return deploymentSettings;
        },
        setHiddenPasswords (deploymentSettings) {
            deploymentSettings.password = 'publii ' + this.$store.state.currentSite.config.name;

            if (deploymentSettings.passphrase) {
                deploymentSettings.passphrase = 'publii-passphrase ' + this.$store.state.currentSite.config.name;
            }

            if (deploymentSettings.s3) {
                deploymentSettings.s3.id = 'publii-s3-id ' + this.$store.state.currentSite.config.name;
                deploymentSettings.s3.key = 'publii-s3-key ' + this.$store.state.currentSite.config.name;
            }

            if (deploymentSettings.netlify) {
                deploymentSettings.netlify.id = 'publii-netlify-id ' + this.$store.state.currentSite.config.name;
                deploymentSettings.netlify.token = 'publii-netlify-token ' + this.$store.state.currentSite.config.name;
            }

            if (deploymentSettings.github) {
                deploymentSettings.github.token = 'publii-gh-token ' + this.$store.state.currentSite.config.name;
            }

            if (deploymentSettings.gitlab) {
                deploymentSettings.gitlab.token = 'publii-gl-token ' + this.$store.state.currentSite.config.name;
            }

            return deploymentSettings;
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.server-settings {
    margin: 0 auto;
    max-width: 960px;
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
    
    &-intro {       
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-gap: 2rem;       
        
        & > div {
            align-items: center;
            background: var(--gray-1);
            border: 1px solid transparent;
            border-radius: 3px;
            display: flex;
            justify-content: center;
            min-height: calc(8rem + 8vh);
            transition: var(--transition);
            
            &:hover {
                background: var(--bg-primary);
                border-color: var(--primary-color);
                box-shadow: 0 0 26px rgba(black, .07);
                cursor: pointer;
                
                & > svg {
                    fill: var(--primary-color);
                }
            }
            
            & > svg {
                fill: var(--gray-5);
                transition: inherit;
            }
        }
    }

    #relative-urls {
        margin-top: 0;
    }
}
</style>
