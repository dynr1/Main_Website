export default function Contact(){

return (

<>

<section>

<div className="container center-block">

<h1>
Let's talk
</h1>


<p>
Tell us a bit about your restaurant and we'll be in touch within a day
</p>

</div>

</section>


<section style={{paddingTop:0}}>

<div className="container content-block">

<form>


<div className="form-group">
<label>Name</label>
<input placeholder="Jane Smith"/>
</div>


<div className="form-group">
<label>Restaurant Name</label>
<input placeholder="The Olive Branch"/>
</div>


<div className="form-group">
<label>Email</label>
<input type="email" placeholder="jane@restaurant.com"/>
</div>


<div className="form-group">
<label>Phone</label>
<input placeholder="07123 456789"/>
</div>


<div className="form-group">
<label>Message</label>
<textarea placeholder="Tell us about your restaurant..." />
</div>


<button className="btn">
Send message
</button>


</form>


</div>

</section>

</>

)

}