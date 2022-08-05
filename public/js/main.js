$(function() {
    $("#txtInput").on('change',function(){
        var fileName = $("#txtInput").val();
        var position = fileName.indexOf('fakepath') + 9
        $(".upload-name").val(fileName.slice(position));
    });
})