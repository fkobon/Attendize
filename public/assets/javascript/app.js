window.Attendize = {
    DateFormat: 'dd-MM-yyyy',
    DateTimeFormat: 'dd-MM-yyyy hh:mm',
    GenericErrorMessage: 'Whoops!, An unknown error has occurred.'
    + 'Please try again or contact support if the problem persists. '
};

$(function () {

    /*
     * --------------------------
     * Set up all our required plugins
     * --------------------------
     */

    /* Datepciker */
    $(document).ajaxComplete(function () {
        $('#DatePicker').remove();
        var $div = $("<div>", {id: "DatePicker"});
        $("body").append($div);
        $div.DateTimePicker({
            dateTimeFormat: window.Attendize.DateTimeFormat
        });

    });

    /* Responsive sidebar */
    $(document.body).on('click', '.toggleSidebar', function (e) {
        $('html').toggleClass('sidebar-open-ltr');
        e.preventDefault();
    });

    /* Scroll to top */
    $(window).scroll(function () {
        if ($(this).scrollTop() > 100) {
            $('.totop').fadeIn();
        } else {
            $('.totop').fadeOut();
        }
    });

    $(".totop").click(function () {
        $("html, body").animate({
            scrollTop: 0
        }, 200);
    });


    /*
     * --------------------
     * Ajaxify those forms
     * --------------------
     *
     * All forms with the 'ajax' class will automatically handle showing errors etc.
     *
     */
    $('form.ajax').ajaxForm({
        delegation: true,
        beforeSubmit: function (formData, jqForm, options) {

            $(jqForm[0])
                .find('.error.help-block')
                .remove();
            $(jqForm[0]).find('.has-error')
                .removeClass('has-error');

            var $submitButton = $(jqForm[0]).find('input[type=submit]');
            toggleSubmitDisabled($submitButton);


        },
        uploadProgress: function (event, position, total, percentComplete) {
            $('.uploadProgress').show().html('Uploading Images - ' + percentComplete + '% Complete...    ');
        },
        error: function (data, statusText, xhr, $form) {

            // Form validation error.
            if (422 == data.status) {
                processFormErrors($form, $.parseJSON(data.responseText));
                return;
            }

            showMessage('Whoops!, it looks like something went wrong on our servers.\n\
                   Please try again, or contact support if the problem persists.');

            var $submitButton = $form.find('input[type=submit]');
            toggleSubmitDisabled($submitButton);

            $('.uploadProgress').hide();
        },
        success: function (data, statusText, xhr, $form) {

            switch (data.status) {
                case 'success':

                    if ($form.hasClass('reset')) {
                        $form.resetForm();
                    }

                    if ($form.hasClass('closeModalAfter')) {
                        $('.modal, .modal-backdrop').fadeOut().remove();
                    }

                    var $submitButton = $form.find('input[type=submit]');
                    toggleSubmitDisabled($submitButton);

                    if (typeof data.message !== 'undefined') {
                        showMessage(data.message);
                    }

                    if (typeof data.runThis !== 'undefined') {
                        eval(data.runThis);
                    }

                    if (typeof data.redirectUrl !== 'undefined') {
                        window.location = data.redirectUrl;
                    }

                    break;

                case 'error':
                    processFormErrors($form, data.messages);
                    break;

                default:
                    break;
            }

            $('.uploadProgress').hide();
        },
        dataType: 'json'
    });


    /*
     * --------------------
     * Create a simple way to show remote dynamic modals from the frontend
     * --------------------
     *
     * E.g :
     * <a href='/route/to/modal' class='loadModal'>
     *  Click For Modal
     * </a>
     *
     */
    $(document.body).on('click', '.loadModal, [data-invoke~=modal]', function (e) {

        var loadUrl = $(this).data('href'),
            modalId = $(this).data('modal-id'),
            cacheResult = $(this).data('cache') === 'on';

        // $('#' + modalId).remove();
        $('.modal').remove();
        $('html').addClass('working');

        /*
         * Hopefully this message will rarely show
         */
        setTimeout(function () {
            //showMessage('One second...'); #far to annoying
        }, 750);

        $.ajax({
            url: loadUrl,
            data: {'modal_id': modalId},
            localCache: cacheResult,
            dataType: 'html',
            success: function (data) {
                hideMessage();

                $('body').append(data);

                var $modal = $('#' + modalId);

                $modal.modal({
                    'backdrop': 'static'
                });

                $modal.modal('show');

                $modal.on('hidden.bs.modal', function (e) {
                    // window
                    location.hash = '';
                });

                $('html').removeClass('working');
            }
        }).done().fail(function (data) {
            $('html').removeClass('working');
            showMessage('Whoops!, something has gone wrong.<br><br>' + data.status + ' ' + data.statusText);
        });

        e.preventDefault();
    });

    /*
     * ------------------------------------------------------------
     * A slightly hackish way to close modals on back button press.
     * ------------------------------------------------------------
     */
    $(window).on('hashchange', function (e) {
        $('.modal').modal('hide');
    });


    /*
     * -------------------------------------------------------------
     * Simple way for any type of object to be deleted.
     * -------------------------------------------------------------
     *
     * E.g markup:
     * <a data-route='/route/to/delete' data-id='123' data-type='objectType'>
     *  Delete This Object
     * </a>
     *
     */
    $('.deleteThis').on('click', function (e) {

        /*
         * Confirm if the user wants to delete this object
         */
        if ($(this).data('confirm-delete') !== 'yes') {
            $(this).data('original-text', $(this).html()).html('Click To Confirm?').data('confirm-delete', 'yes');

            var that = $(this);
            setTimeout(function () {
                that.data('confirm-delete', 'no').html(that.data('original-text'));
            }, 2000);

            return;
        }

        var deleteId = $(this).data('id'),
            deleteType = $(this).data('type'),
            route = $(this).data('route');

        $.post(route, deleteType + '_id=' + deleteId)
            .done(function (data) {

                if (typeof data.message !== 'undefined') {
                    showMessage(data.message);
                }

                switch (data.status) {
                    case 'success':
                        $('#' + deleteType + '_' + deleteId).fadeOut();
                        break;
                    case 'error':
                        /* Error */
                        break;

                    default:
                        break;
                }
            }).fail(function (data) {
            showMessage(Attendize.GenericErrorMessages);
        });

        e.preventDefault();
    });


    $(document.body).on('click', '.pauseTicketSales', function (e) {

        var ticketId = $(this).data('id'),
            route = $(this).data('route');

        $.post(route, 'ticket_id=' + ticketId)
            .done(function (data) {

                if (typeof data.message !== 'undefined') {
                    showMessage(data.message);
                }

                switch (data.status) {
                    case 'success':
                        setTimeout(function () {
                            document.location.reload();
                        }, 300);
                        break;
                    case 'error':
                        /* Error */
                        break;

                    default:
                        break;
                }
            }).fail(function (data) {
            showMessage(Attendize.GenericErrorMessages);
        });


        e.preventDefault();
    });

    /**
     * Toggle checkboxes
     */
    $(document.body).on('click', '.check-all', function (e) {
        var toggleClass = $(this).data('check-class');
        $('.' + toggleClass).each(function () {
            this.checked = $(this).checked;
        });
    });


    /*
     * ------------------------------------------------------------
     * Toggle hidden content when a.show-more-content is clicked
     * ------------------------------------------------------------
     */
    $(document.body).on('click', '.show-more-options', function (e) {

        var toggleClass = !$(this).data('toggle-class')
            ? '.more-options'
            : $(this).data('toggle-class');


        if ($(this).hasClass('toggled')) {
            $(this).html($(this)
                .data('original-text'));

        } else {

            if (!$(this).data('original-text')) {
                $(this).data('original-text', $(this).html());
            }
            $(this).html(!$(this).data('show-less-text') ? 'Show Less' : $(this).data('show-less-text'));
        }

        $(this).toggleClass('toggled');

        /*
         * ?
         */
        if ($(this).data('clear-field')) {
            $($(this).data('clear-field')).val('');
        }

        $(toggleClass).slideToggle();
        e.preventDefault();
    });


    /*
     * Sort by trigger
     */
    $('select[name=sort_by_select]').on('change', function () {
        $('input[name=sort_by]').val($(this).val()).closest('form').submit();
    });

    /**
     * Custom file inputs
     */
    $(document).on('change', '.btn-file :file', function () {
        var input = $(this),
            numFiles = input.get(0).files ? input.get(0).files.length : 1,
            label = input.val().replace(/\\/g, '/').replace(/.*\//, '');

        input.trigger('fileselect', [
            numFiles,
            label
        ]);
    });

    $(document.body).on('fileselect', '.btn-file :file', function (event, numFiles, label) {
        var input = $(this).parents('.input-group').find(':text'),
            log = numFiles > 1 ? numFiles + ' files selected' : label;
        if (input.length) {
            input.val(log);
        } else {
            if (log) {
                console.log(log);
            }

        }
    });

});

function changeQuestionType(select)
{
    var select = $(select);
    var selected = select.find(':selected');

    if (selected.data('has-options') == '1') {
        $('#question-options').removeClass('hide');
    } else {
        $('#question-options').addClass('hide');
    }
}

function submitQuestionForm()
{
    $('#edit-question-form').submit();
}

function addQuestionOption()
{
    var tbody = $('#question-options tbody');
    var questionOption = $('#question-option-template').html();

    tbody.append(questionOption);
}

function removeQuestionOption(removeBtn)
{
    var removeBtn = $(removeBtn);
    var tbody = removeBtn.parents('tbody');

    if (tbody.find('tr').length > 1) {
        removeBtn.parents('tr').remove();
    } else {
        alert('You must have at least one option.');
    }
}

function processFormErrors($form, errors)
{
    $.each(errors, function (index, error)
    {
        var $input = $(':input[name=' + index + ']', $form);

        if ($input.prop('type') === 'file') {
            $('#input-' + $input.prop('name')).append('<div class="help-block error">' + error + '</div>')
                .parent()
                .addClass('has-error');
        } else {
            $input.after('<div class="help-block error">' + error + '</div>')
                .parent()
                .addClass('has-error');
        }

    });

    var $submitButton = $form.find('input[type=submit]');
    toggleSubmitDisabled($submitButton);
}

function reloadPageDelayed()
{
    setTimeout(function () {
        location.reload();
    }, 2000);
}

/**
 *
 * @param elm $submitButton
 * @returns void
 */
function toggleSubmitDisabled($submitButton) {

    if ($submitButton.hasClass('disabled')) {
        $submitButton.attr('disabled', false)
            .removeClass('disabled')
            .val($submitButton.data('original-text'));
        return;
    }

    $submitButton.data('original-text', $submitButton.val())
        .attr('disabled', true)
        .addClass('disabled')
        .val('Working...');
}

/**
 * Shows users a message.
 * Currently uses humane.js
 *
 * @param string message
 * @returns void
 */
function showMessage(message) {
    humane.log(message, {
        timeout: 3500
    });
}

function showHelp(message) {
    humane.log(message, {
        timeout: 12000
    });
}

function hideMessage() {
    humane.remove();
}
