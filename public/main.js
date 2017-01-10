$( document ).ready(function() {

	function getStatus() {
		$.ajax({ 
			method: "post",
			url: "/status",
			dataType: "json",
			timeout: 1000,
			success: function( data){
				// console.log(data.refreshTimestamp);
				$(".refreshTimestamp").text(data.refreshTimestamp);
				if (data.status===0){
					$("#backupBtn").addClass("btn-danger").removeClass("btn-default");
					$("#masterBtn").addClass("btn-default").removeClass("btn-success");
				} else if (data.status===1) {
					$("#masterBtn").addClass("btn-success").removeClass("btn-default");
					$("#backupBtn").addClass("btn-default").removeClass("btn-danger");
				}
			},
			error: function() {
				console.log("Napaka na komunikaciji!");
				$(".refreshTimestamp").html("<strong>Napaka na komunikaciji!<strong>");
			}
		});
	};
	getStatus();
	setInterval(function(){
		console.log('GET STATUS');
		getStatus();
	}, 3000);
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