$.post( "/status", function(data){
	console.log(data.status);
	if (data.status===0){
		$("#backupBtn").addClass("btn-danger").removeClass("btn-default");
		$("#masterBtn").addClass("btn-default").removeClass("btn-success");
	} else if (data.status===1) {
		$("#masterBtn").addClass("btn-success").removeClass("btn-default");
		$("#backupBtn").addClass("btn-default").removeClass("btn-danger");
	}
});


$("#masterBtn").on('click', function(){
	$.post( "/preklop", {preklop: 1}, function(){
		$("#masterBtn").addClass("btn-success").removeClass("btn-default");
		$("#backupBtn").addClass("btn-default").removeClass("btn-danger");
	});
});

$("#backupBtn").on('click', function(){
	$.post( "/preklop", {preklop: 0}, function(){
		$("#backupBtn").addClass("btn-danger").removeClass("btn-default");
		$("#masterBtn").addClass("btn-default").removeClass("btn-success");
	});
});