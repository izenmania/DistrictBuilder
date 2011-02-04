/*
   Copyright 2010 Micah Altman, Michael McDonald

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

   This file is part of The Public Mapping Project
   http://sourceforge.net/projects/publicmapping/

   Purpose:
       This script file defines the behaviors and components used for
       the user registration and login process.

   Author: 
        Andrew Jennings, David Zwarg
*/

/**
 * Define an anonymous function to be called when the document is ready.
 */
$(function(){
    var dOptions = {
        autoOpen:false,
        width:425,
        modal:true,
        resizable: false
    };
    // configure the registration dialog
    $('#register').dialog(dOptions);
    $('#forgotpass').dialog($.extend({title:'Forgot Password'},dOptions));
    $('#sessiondupe').dialog($.extend({title:'Duplicate Session'},dOptions));
    $('#sessionsmax').dialog($.extend({title:'Maximum Users Exceeded'},dOptions));

    // generic dialog in case registration is unavailable
    var genericRegistrationError = function() {
        $('#register').dialog('close');
        $('#doRegister').attr('disabled',true).css('cursor', 'not-allowed');
        $('#sign_up').attr('disabled',true).css('cursor', 'not-allowed');
        $('<div class="error">Sorry, registration is not available at this time.  Please try logging in anonymously or coming back later.</div>').dialog({
            modal: true,
            title: 'Signup Unavailable',
            resizable:false, 
            width:300
        });
    };

    // when the register form is submitted, do some client side validation
    // first, before sending it up to the server
    $('#doRegister').click(function(evt) {
        var frm = $('#registerForm'),
            username = frm.find('#newusername'),
            newpassword1 = frm.find('#newpassword1'),
            newpassword2 = frm.find('#newpassword2'),
            passwordhint = frm.find('#passwordhint'),
            email = frm.find('#email'),
            agree = frm.find('#agree'),
            userid = frm.find('#userid');

        if (username.val() == '' || username.val().length > 30) {
            username.removeClass('field');
            username.addClass('error');
            return false;
        }
        else {
            username.removeClass('error');
            username.addClass('field');
        }

        if ((newpassword1.val() == '' && userid.val() == '') ||
            newpassword1.val() != newpassword2.val()) {
            newpassword1.removeClass('field');
            newpassword1.addClass('error');
            newpassword2.removeClass('field');
            newpassword2.addClass('error');
            return false;
        }
        else {
            newpassword1.removeClass('error');
            newpassword1.addClass('field');
            newpassword2.removeClass('error');
            newpassword2.addClass('field');
        }

        // A basic password complexity test; At least 8 characters and at least
        // one number, one lower-case letter and one upper-case letter
        var isComplex = function(password) {
            return /\d/.test(password) &&
                 /[a-z]/.test(password) &&
                 /[A-Z]/.test(password) &&
                 password.length >= 8;
        };

        if (!isComplex(newpassword1.val())) {
            $('#passwordinstructions').css('color', 'red');
            return false;
        }
        else {
            $('#passwordinstructions').css('color', '');
        }

        if (passwordhint.val() == '') {
            passwordhint.removeClass('field');
            passwordhint.addClass('error');
            return false;
        }
        else {
            passwordhint.addClass('field');
            passwordhint.removeClass('error');
        }
        if (email.val().trim() != '') {
            if (!(email.val().match(/^([\w\-\.\+])+\@([\w\-\.])+\.([A-Za-z]{2,4})$/))) {
                email.removeClass('field');
                email.addClass('error');
                return false;
            }
            else {
                email.addClass('field');
                email.removeClass('error');
            }            
        }

        if (agree.length > 0 && !agree[0].checked) {
            $('#agreelabel').addClass('required');
            return false;
        }

        jQuery.ajax({
            context:frm[0],
            data: { 
                userid:$('#userid').val(),
                newusername:username.val(),
                newpassword1:newpassword1.val(),
                newpassword2:newpassword2.val(),
                email:email.val(),
                passwordhint:passwordhint.val(),
                firstname:$('#firstname').val(),
                lastname:$('#lastname').val(),
                organization:$('#organization').val()
            },
            dataType:'json',
            type:'POST',
            url:frm[0].action,
            success:function(data,textStatus,xhr){
                if ($('#userid').val() == '') {
                    $('#dupemail').css('display','none');
                    if (data.success) {
                        if (typeof(_gaq) != 'undefined') { _gaq.push(['_trackEvent', 'Users', 'Registered']); }
                        $('#register').dialog('close');
                        $('<div>You\'ve been registered for the public mapping project.</div>').dialog({
                            modal:true,
                            width:300,
                            title:'Success!',
                            buttons: {
                                "Start Mapping": function() {
                                    window.location.href = data.redirect;
                                    return;
                                }
                            },
                            resizable:false,
                            open: function(event, ui) {
                                $(".ui-dialog-titlebar-close", $(this).parent()).hide();
                            }
                        });
                    } else if (data.message == 'name exists') {
                        var newusername = $('#newusername');
                        newusername.removeClass('field');
                        newusername.addClass('error');
                    } else if (data.message == 'email exists') {
                        var email = $('#email');
                        email.removeClass('field');
                        email.addClass('error');
                        $('#dupemail').css('display','block');
                    } else {
                        genericRegistrationError();
                    }
                }
                else {
                    if (data.success) {
                        newpassword1.val('');
                        newpassword2.val('');
                    }
                    $('#register').dialog('close');
                }
            },
            error:function(xhr,textStatus,error){
                genericRegistrationError();
            }
        });

        return false;
    });

    // go straight to the viewing pg
    $('#doAnonymous').click(function(evt) {
        window.location.href = '/accounts/logout/?next=/districtmapping/plan/0/view';
        return false;
    });

    // when the remind button is clicked, display a dialog for options
    // available for password recovery.
    $('#doRemind').click(function(evt){
        var frm = $('#forgotForm')[0];
        $('#forgotusername, #forgotemail').removeClass('error');

        var remindBtn = $('#doRemind');
        remindBtn.attr('disabled',true);
        var btnText = remindBtn.text();
        remindBtn.html('<span class="ui-button-text">Please Wait...</span>');

        $.ajax({
            context:frm,
            data: {
                username: $('#forgotusername').val(),
                email: $('#forgotemail').val()
            },
            dataType:'json',
            type:'POST',
            url:frm.action,
            success: function(data,textStatus,xhr){
                var remindBtn = $('#doRemind');
                remindBtn.attr('disabled',null);
                remindBtn.html('<span class="ui-button-text">'+btnText+'</span>');
                if (data.success) {

                    if (data.mode == 'hinting') {
                        $('#forgotprompt, #forgotButton').css('display','none');
                        $('#forgothint, #forgotButton2').css('display','block');
                        $('#forgothintbox').val( data.hint );
                    }
                    else if (data.mode == 'sending') {
                        $('#forgotprompt, #forgotButton').css('display','none');
                        $('#forgotsent, #forgotButton2').css('display','block');
                    }
                }
                else if (data.field) {
                    if (data.field != 'email') {
                        $('#forgotusername').addClass('error');
                    }
                    if (data.field != 'username') {
                        $('#forgotemail').addClass('error');
                    }
                }
            },
            error:function(xhr,textStatus,error){
                var remindBtn = $('#doRemind');
                remindBtn.html('<span class="ui-button-text">'+btnText+'</span>');
                remindBtn.attr('disabled',true);
            }
        });

        return false;
    });

    // do this operation when a user goes 'back' in the dialog
    $('#doBack').click(function(){
        $('#forgotprompt, #forgotButton').css('display','block');
        $('#forgothint, #forgotsent, #forgotButton2').css('display','none');
        return false;
    });

    // do this operation when a user closes the dialog
    $('#doClose').click(function(){
        $('#forgotpass').dialog('close');
        $('#forgotprompt, #forgotButton').css('display','block');
        $('#forgothint, #forgotsent, #forgotButton2').css('display','none');
        return false;
    });

    // if the location of this page has /account/login/ in it, it must have
    // been the result of a failed login redirect. display error notices
    // around the username and password fields
    if (new RegExp('.*/accounts/login/$').test(window.location.href)) {
        $('<div class="error">You entered an incorrect user name or password</div>').dialog({
            modal:true,
            width:300,
            resizable:false,
            title:'Login Error'
        });
        $('#username, #password').addClass('error');
    } else if( 'opensessions' in window && opensessions > 1 ) {
        // If there is a page variable named opensessions, and it is
        // greater than one, that means that we've been bumped back to
        // the index page after attempting a login. This means that the
        // user attempting to log in has an active session on another
        // browser or computer. Give them options on how to access the app.
        $('#sessiondupe').dialog('open');
        $('#force_close').click(function() {
            var frm = $('#purge_form')[0];
            $.ajax({
                context:frm,
                data: {
                    username: $('#purge_username').val()
                },
                dataType:'json',
                type:'POST',
                url:frm.action,
                success: function(data,textStatus,xhr){
                    $('#sessiondupe').dialog('close');
                },
                error: function(xhr,textStatus,error) {
                    $('#sessiondupe').dialog('close');
                }
            });
            return false;
        });
        $('#different_login').click(function() {
            $('#sessiondupe').dialog('close');
            return false;
        });
    } else if ( 'availsession' in window && !availsession ) {
        // If there is a page variable named availsession, and it is
        // false, that means that we've been bumped back to the index
        // page after attempting a login. This means that the maximum
        // number of active sessions has been reached. Inform the user
        // to come back and try again later.
        $('#sessionsmax').dialog('open');
    } else {
        var re = new RegExp('[\\?\\&].+?=[^\\&]*','g');
        var matches = window.location.search.match(re);
        for (var i = 0; matches !== null && i < matches.length; i++) {
            var re2 = new RegExp('[\\?\\&](.+?)=([^\\&]*)$');
            var matches2 = matches[i].match(re2);

            if (matches2[1] == 'msg' && matches2[2] == 'logoff') {
                $('<div title="Logged Off" id="logoffdlg"><p>You have been logged off by another browser. This happens sometimes if you attempt to access the application from two different locations.</p><h1>Please log in again.</h1></div>').dialog({
                    modal:true,
                    resizable:false
                });
                return;
            }
        }
    }

});