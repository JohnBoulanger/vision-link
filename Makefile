.PHONY: clean zip realclean

DIRNAME := $(notdir $(CURDIR))
ZIPFILE := a3-$(DIRNAME).zip

clean:
	-cd backend && rm -rf node_modules package-lock.json
	-cd frontend && rm -rf node_modules package-lock.json

realclean: clean
	rm -rf *.out ../$(ZIPFILE)

# creates a zip file in the parent directory
zip: realclean
	zip -r ../$(ZIPFILE) .

