require 'rack'
root=Dir.pwd
run Rack::Directory.new("#{root}")